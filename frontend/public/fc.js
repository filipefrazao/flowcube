/**
 * FunnelCube Analytics SDK v1.0.0
 * Lightweight, cookie-less tracking for FunnelCube analytics.
 *
 * (c) 2026 FRZ Group. All rights reserved.
 *
 * Features:
 *   - No dependencies (vanilla JS)
 *   - Cookie-less device fingerprinting (FNV-1a hash)
 *   - Pre-init event queue with replay
 *   - Batched event dispatch (flush every 5s or at 10 events)
 *   - SPA-aware page view tracking (pushState / replaceState / popstate)
 *   - GDPR-friendly: no cookies, no localStorage for PII
 *   - Graceful error handling: never throws on the host page
 */
(function (window) {
  'use strict';

  // ---------------------------------------------------------------------------
  // Guard: prevent double-loading
  // ---------------------------------------------------------------------------
  if (window.FunnelCube && window.FunnelCube._loaded) {
    return;
  }

  // ---------------------------------------------------------------------------
  // Constants
  // ---------------------------------------------------------------------------
  var VERSION = '1.0.0';
  var BATCH_SIZE = 10;
  var FLUSH_INTERVAL_MS = 5000;

  // ---------------------------------------------------------------------------
  // Internal state
  // ---------------------------------------------------------------------------
  var _config = null;       // set by init()
  var _initialized = false;
  var _queue = [];           // pre-init command queue
  var _batch = [];           // events awaiting dispatch
  var _flushTimer = null;
  var _deviceId = null;      // computed fingerprint
  var _sessionId = null;     // random per-page-load session
  var _userId = null;
  var _userTraits = {};
  var _lastPath = null;      // for SPA navigation dedup

  // ---------------------------------------------------------------------------
  // Utility: safe wrapper - catch all errors so we never break host page
  // ---------------------------------------------------------------------------
  function safe(fn) {
    return function () {
      try {
        return fn.apply(this, arguments);
      } catch (e) {
        if (typeof console !== 'undefined' && console.warn) {
          console.warn('[FunnelCube]', e);
        }
      }
    };
  }

  // ---------------------------------------------------------------------------
  // Utility: FNV-1a 32-bit hash
  // ---------------------------------------------------------------------------
  function fnv1a(str) {
    var hash = 0x811c9dc5; // offset basis
    for (var i = 0; i < str.length; i++) {
      hash ^= str.charCodeAt(i);
      hash = (hash * 0x01000193) >>> 0; // multiply and keep 32-bit unsigned
    }
    return hash.toString(16);
  }

  // ---------------------------------------------------------------------------
  // Utility: generate a random ID (session, event)
  // ---------------------------------------------------------------------------
  function randomId() {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    // Fallback: pseudo-random hex string
    var s = '';
    for (var i = 0; i < 32; i++) {
      s += ((Math.random() * 16) | 0).toString(16);
    }
    return (
      s.substring(0, 8) + '-' +
      s.substring(8, 12) + '-' +
      s.substring(12, 16) + '-' +
      s.substring(16, 20) + '-' +
      s.substring(20)
    );
  }

  // ---------------------------------------------------------------------------
  // Utility: get current timestamp in ISO format
  // ---------------------------------------------------------------------------
  function now() {
    return new Date().toISOString();
  }

  // ---------------------------------------------------------------------------
  // Utility: shallow merge (target, source) -> target
  // ---------------------------------------------------------------------------
  function merge(target, source) {
    if (!source) return target;
    for (var key in source) {
      if (source.hasOwnProperty(key)) {
        target[key] = source[key];
      }
    }
    return target;
  }

  // ---------------------------------------------------------------------------
  // Device fingerprint (cookie-less)
  // Combines screen dimensions, timezone, language, and platform into a hash.
  // ---------------------------------------------------------------------------
  function computeDeviceId() {
    var parts = [];
    var s = window.screen || {};
    parts.push(String(s.width || 0));
    parts.push(String(s.height || 0));
    parts.push(String(s.colorDepth || 0));
    try {
      parts.push(Intl.DateTimeFormat().resolvedOptions().timeZone || '');
    } catch (e) {
      parts.push(String(new Date().getTimezoneOffset()));
    }
    parts.push(navigator.language || navigator.userLanguage || '');
    parts.push(navigator.platform || '');
    parts.push(String(navigator.hardwareConcurrency || ''));
    return 'fc_' + fnv1a(parts.join('|'));
  }

  // ---------------------------------------------------------------------------
  // Get current page context
  // ---------------------------------------------------------------------------
  function pageContext() {
    return {
      url: window.location.href,
      path: window.location.pathname,
      title: document.title || '',
      referrer: document.referrer || ''
    };
  }

  // ---------------------------------------------------------------------------
  // Build event payload
  // ---------------------------------------------------------------------------
  function buildEvent(eventName, properties) {
    var page = pageContext();
    var payload = {
      event: eventName,
      timestamp: now(),
      event_id: randomId(),
      device_id: _deviceId,
      session_id: _sessionId,
      sdk_version: VERSION,
      page: page,
      properties: properties || {}
    };

    if (_userId) {
      payload.user_id = _userId;
    }
    if (Object.keys(_userTraits).length > 0) {
      payload.user_traits = _userTraits;
    }

    return payload;
  }

  // ---------------------------------------------------------------------------
  // Send a single event to the API
  // Uses sendBeacon for reliability on page unload, fetch with keepalive
  // as primary, and falls back to XHR.
  // ---------------------------------------------------------------------------
  function sendEvent(payload, useBeacon) {
    if (!_config || !_config.apiUrl) return;

    var url = _config.apiUrl.replace(/\/+$/, '') + '/track/';
    var body = JSON.stringify(payload);
    var headers = {
      'Content-Type': 'application/json',
      'X-Client-ID': _config.clientId || '',
      'X-Client-Secret': _config.clientSecret || ''
    };

    // Attempt sendBeacon first when explicitly requested (page unload)
    if (useBeacon && navigator.sendBeacon) {
      try {
        var blob = new Blob([body], { type: 'application/json' });
        var sent = navigator.sendBeacon(url, blob);
        if (sent) return;
        // sendBeacon does not support custom headers, so if auth is required
        // it may be rejected server-side. Fall through to fetch.
      } catch (e) {
        // fall through
      }
    }

    // Primary: fetch with keepalive
    if (typeof fetch === 'function') {
      fetch(url, {
        method: 'POST',
        headers: headers,
        body: body,
        keepalive: true,
        mode: 'cors'
      }).catch(function () {
        // silently ignore network errors
      });
      return;
    }

    // Fallback: XMLHttpRequest
    try {
      var xhr = new XMLHttpRequest();
      xhr.open('POST', url, true);
      for (var h in headers) {
        if (headers.hasOwnProperty(h)) {
          xhr.setRequestHeader(h, headers[h]);
        }
      }
      xhr.send(body);
    } catch (e) {
      // silently ignore
    }
  }

  // ---------------------------------------------------------------------------
  // Batch management
  // ---------------------------------------------------------------------------
  function addToBatch(payload) {
    _batch.push(payload);
    if (_batch.length >= BATCH_SIZE) {
      flushBatch(false);
    }
  }

  function flushBatch(useBeacon) {
    if (_batch.length === 0) return;
    var events = _batch.slice();
    _batch = [];
    for (var i = 0; i < events.length; i++) {
      sendEvent(events[i], useBeacon);
    }
  }

  function startFlushTimer() {
    if (_flushTimer) return;
    _flushTimer = setInterval(function () {
      flushBatch(false);
    }, FLUSH_INTERVAL_MS);
  }

  function stopFlushTimer() {
    if (_flushTimer) {
      clearInterval(_flushTimer);
      _flushTimer = null;
    }
  }

  // ---------------------------------------------------------------------------
  // SPA navigation tracking
  // ---------------------------------------------------------------------------
  function onNavigation() {
    var currentPath = window.location.pathname + window.location.search;
    if (currentPath === _lastPath) return; // dedup
    _lastPath = currentPath;
    trackScreenView();
  }

  function trackScreenView() {
    var page = pageContext();
    FunnelCube.track('screen_view', {
      path: page.path,
      title: page.title,
      url: page.url,
      referrer: page.referrer
    });
  }

  function patchHistoryMethod(method) {
    var original = history[method];
    if (!original) return;
    history[method] = function () {
      var result = original.apply(this, arguments);
      onNavigation();
      return result;
    };
  }

  function setupAutoPageViews() {
    // Track initial page view
    _lastPath = window.location.pathname + window.location.search;
    trackScreenView();

    // Listen for SPA navigation
    patchHistoryMethod('pushState');
    patchHistoryMethod('replaceState');
    window.addEventListener('popstate', onNavigation);
  }

  // ---------------------------------------------------------------------------
  // Auto outgoing link tracking
  // ---------------------------------------------------------------------------
  function setupOutgoingTracking() {
    document.addEventListener('click', function (e) {
      var target = e.target;
      // Walk up the DOM to find an anchor
      while (target && target.tagName !== 'A') {
        target = target.parentElement;
      }
      if (!target || !target.href) return;

      try {
        var linkUrl = new URL(target.href, window.location.origin);
        if (linkUrl.hostname !== window.location.hostname) {
          FunnelCube.track('outgoing_click', {
            url: target.href,
            text: (target.textContent || '').substring(0, 200).trim()
          });
        }
      } catch (e) {
        // invalid URL, ignore
      }
    }, true); // capture phase so we catch it before navigation
  }

  // ---------------------------------------------------------------------------
  // Flush on page unload
  // ---------------------------------------------------------------------------
  function setupUnloadFlush() {
    var handler = function () {
      flushBatch(true);
    };
    window.addEventListener('visibilitychange', function () {
      if (document.visibilityState === 'hidden') {
        handler();
      }
    });
    window.addEventListener('pagehide', handler);
    // 'beforeunload' as last resort for older browsers
    window.addEventListener('beforeunload', handler);
  }

  // ---------------------------------------------------------------------------
  // Replay pre-init queue (from the snippet stub)
  // ---------------------------------------------------------------------------
  function replayQueue(commands) {
    if (!commands || !commands.length) return;
    for (var i = 0; i < commands.length; i++) {
      var cmd = commands[i];
      if (!cmd || !cmd.length) continue;
      var method = cmd[0];
      var args = cmd.slice(1);
      if (typeof FunnelCube[method] === 'function') {
        FunnelCube[method].apply(FunnelCube, args);
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------
  var FunnelCube = {};

  /**
   * Initialize the SDK.
   *
   * @param {Object} options
   * @param {string} options.clientId       - Client identifier (fc_xxx)
   * @param {string} options.clientSecret   - Client secret (fcs_xxx)
   * @param {string} options.apiUrl         - API base URL
   * @param {boolean} [options.autoTrackPageViews=true]  - Auto-track page views
   * @param {boolean} [options.autoTrackOutgoing=false]  - Auto-track outgoing link clicks
   */
  FunnelCube.init = safe(function (options) {
    if (_initialized) {
      if (typeof console !== 'undefined' && console.warn) {
        console.warn('[FunnelCube] Already initialized. Ignoring duplicate init().');
      }
      return;
    }

    if (!options || !options.clientId || !options.clientSecret || !options.apiUrl) {
      if (typeof console !== 'undefined' && console.error) {
        console.error('[FunnelCube] init() requires clientId, clientSecret, and apiUrl.');
      }
      return;
    }

    _config = {
      clientId: options.clientId,
      clientSecret: options.clientSecret,
      apiUrl: options.apiUrl,
      autoTrackPageViews: options.autoTrackPageViews !== false, // default true
      autoTrackOutgoing: options.autoTrackOutgoing === true      // default false
    };

    _deviceId = computeDeviceId();
    _sessionId = randomId();
    _initialized = true;

    // Start batch flush timer
    startFlushTimer();

    // Flush remaining events on page unload
    setupUnloadFlush();

    // Auto page view tracking
    if (_config.autoTrackPageViews) {
      setupAutoPageViews();
    }

    // Auto outgoing link tracking
    if (_config.autoTrackOutgoing) {
      setupOutgoingTracking();
    }

    // Replay any events that were queued before init
    if (_queue.length > 0) {
      var pending = _queue.slice();
      _queue = [];
      for (var i = 0; i < pending.length; i++) {
        addToBatch(pending[i]);
      }
    }
  });

  /**
   * Track a custom event.
   *
   * @param {string} eventName   - Name of the event (e.g. 'signup', 'purchase')
   * @param {Object} [properties] - Arbitrary key-value properties
   */
  FunnelCube.track = safe(function (eventName, properties) {
    if (!eventName || typeof eventName !== 'string') return;

    var payload = buildEvent(eventName, properties || {});

    if (!_initialized) {
      // Queue for replay after init()
      _queue.push(payload);
      return;
    }

    addToBatch(payload);
  });

  /**
   * Identify a user. Associates subsequent events with this user.
   *
   * @param {string} userId       - Unique user identifier
   * @param {Object} [traits]     - User traits (email, firstName, etc.)
   */
  FunnelCube.identify = safe(function (userId, traits) {
    if (!userId) return;

    _userId = String(userId);
    _userTraits = merge({}, traits);

    // Send an identify event
    var payload = buildEvent('identify', merge({ user_id: _userId }, _userTraits));

    if (!_initialized) {
      _queue.push(payload);
      return;
    }

    addToBatch(payload);
  });

  /**
   * Manually flush all pending events.
   */
  FunnelCube.flush = safe(function () {
    flushBatch(false);
  });

  /**
   * Reset the SDK state (useful for logout).
   * Clears user identity and generates a new session.
   */
  FunnelCube.reset = safe(function () {
    _userId = null;
    _userTraits = {};
    _sessionId = randomId();
  });

  // Mark as loaded to prevent double-init
  FunnelCube._loaded = true;
  FunnelCube.version = VERSION;

  // ---------------------------------------------------------------------------
  // Bootstrap: check for pre-init stub queue (from the HTML snippet)
  // ---------------------------------------------------------------------------
  var stub = window.__fc;
  var pendingCommands = stub && stub.q ? stub.q.slice() : [];

  // Expose the real FunnelCube object globally
  window.FunnelCube = FunnelCube;

  // Replay any commands queued by the stub snippet
  if (pendingCommands.length > 0) {
    replayQueue(pendingCommands);
  }

})(window);
