"""
PageCube Page Renderer

Converts Puck editor JSON data into static HTML.
Each block type has a dedicated renderer function that produces
Tailwind-styled HTML matching the React component output.
"""
import json
import logging
from html import escape
from urllib.parse import quote

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Block renderers
# ---------------------------------------------------------------------------

def _render_hero(props: dict) -> str:
    title = escape(props.get('title', 'Your Headline Here'))
    subtitle = escape(props.get('subtitle', ''))
    cta_text = escape(props.get('ctaText', 'Get Started'))
    cta_url = escape(props.get('ctaUrl', '#'))
    bg_image = props.get('backgroundImage', '')
    bg_gradient = props.get('backgroundGradient', 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)')
    alignment = props.get('alignment', 'center')

    align_cls = {'left': 'text-left items-start', 'center': 'text-center items-center', 'right': 'text-right items-end'}
    align = align_cls.get(alignment, align_cls['center'])

    bg_style = f"background-image: url('{escape(bg_image)}'); background-size: cover; background-position: center;" if bg_image else f"background: {escape(bg_gradient)};"

    return f"""<section class="relative min-h-[70vh] flex items-center justify-center px-4 sm:px-6 lg:px-8" style="{bg_style}">
  {"<div class='absolute inset-0 bg-black/40'></div>" if bg_image else ""}
  <div class="relative z-10 max-w-4xl mx-auto flex flex-col gap-6 {align} py-20">
    <h1 class="text-4xl sm:text-5xl lg:text-6xl font-bold text-white leading-tight">{title}</h1>
    {f'<p class="text-lg sm:text-xl text-white/90 max-w-2xl">{subtitle}</p>' if subtitle else ''}
    <a href="{cta_url}" class="inline-flex items-center justify-center rounded-lg bg-white text-gray-900 font-semibold px-8 py-4 text-lg hover:bg-gray-100 transition-colors">{cta_text}</a>
  </div>
</section>"""


def _render_cta(props: dict) -> str:
    heading = escape(props.get('heading', 'Ready to Get Started?'))
    description = escape(props.get('description', ''))
    btn_text = escape(props.get('buttonText', 'Start Now'))
    btn_url = escape(props.get('buttonUrl', '#'))
    btn_color = escape(props.get('buttonColor', '#ef4444'))
    bg_color = escape(props.get('backgroundColor', '#ffffff'))
    show_countdown = props.get('showCountdown', False)
    countdown_date = props.get('countdownDate', '')

    countdown_html = ''
    if show_countdown and countdown_date:
        safe_date = escape(countdown_date)
        countdown_html = f"""<div id="cta-countdown" class="flex justify-center gap-4 my-6" data-target="{safe_date}">
  <div class="flex flex-col items-center"><span class="text-3xl font-bold" id="cta-cd-d">00</span><span class="text-sm text-gray-500">Days</span></div>
  <div class="flex flex-col items-center"><span class="text-3xl font-bold" id="cta-cd-h">00</span><span class="text-sm text-gray-500">Hours</span></div>
  <div class="flex flex-col items-center"><span class="text-3xl font-bold" id="cta-cd-m">00</span><span class="text-sm text-gray-500">Min</span></div>
  <div class="flex flex-col items-center"><span class="text-3xl font-bold" id="cta-cd-s">00</span><span class="text-sm text-gray-500">Sec</span></div>
</div>"""

    countdown_script = ''
    if show_countdown and countdown_date:
        safe_date = escape(countdown_date)
        countdown_script = f"""<script>
(function(){{var t=new Date("{safe_date}").getTime();if(isNaN(t))return;function u(){{var n=t-Date.now();if(n<=0){{document.getElementById("cta-countdown").innerHTML='<span class="text-xl font-bold">Expired</span>';return}}var d=Math.floor(n/864e5),h=Math.floor(n%864e5/36e5),m=Math.floor(n%36e5/6e4),s=Math.floor(n%6e4/1e3);document.getElementById("cta-cd-d").textContent=String(d).padStart(2,"0");document.getElementById("cta-cd-h").textContent=String(h).padStart(2,"0");document.getElementById("cta-cd-m").textContent=String(m).padStart(2,"0");document.getElementById("cta-cd-s").textContent=String(s).padStart(2,"0")}}u();setInterval(u,1000)}})();
</script>"""

    return f"""<section class="py-16 px-4" style="background-color: {bg_color};">
  <div class="max-w-3xl mx-auto text-center space-y-6">
    <h2 class="text-3xl sm:text-4xl font-bold text-gray-900">{heading}</h2>
    {f'<p class="text-lg text-gray-600">{description}</p>' if description else ''}
    {countdown_html}
    <a href="{btn_url}" class="inline-flex items-center justify-center rounded-lg text-white font-semibold px-8 py-4 text-lg hover:opacity-90 transition-opacity" style="background-color: {btn_color};">{btn_text}</a>
  </div>
</section>
{countdown_script}"""


def _render_pricing(props: dict) -> str:
    title = escape(props.get('title', 'Pricing'))
    subtitle = escape(props.get('subtitle', ''))
    plans = props.get('plans', [])

    plans_html = []
    for plan in plans:
        highlighted = plan.get('highlighted', False)
        name = escape(plan.get('name', ''))
        price = escape(str(plan.get('price', '')))
        period = escape(plan.get('period', '/month'))
        cta = escape(plan.get('ctaText', 'Choose Plan'))
        features = plan.get('features', [])

        border = 'border-2 border-blue-600 shadow-xl scale-105' if highlighted else 'border border-gray-200'
        badge = '<span class="absolute -top-3 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-xs font-bold px-3 py-1 rounded-full">Most Popular</span>' if highlighted else ''

        features_html = '\n'.join(f'<li class="flex items-center gap-2"><svg class="w-5 h-5 text-green-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg><span>{escape(str(f))}</span></li>' for f in features)

        plans_html.append(f"""<div class="relative rounded-2xl bg-white p-8 {border}">
  {badge}
  <h3 class="text-xl font-bold text-gray-900">{name}</h3>
  <div class="mt-4"><span class="text-4xl font-bold text-gray-900">{price}</span><span class="text-gray-500">{period}</span></div>
  <ul class="mt-6 space-y-3 text-gray-600">{features_html}</ul>
  <a href="#" class="mt-8 block w-full text-center rounded-lg {'bg-blue-600 text-white hover:bg-blue-700' if highlighted else 'bg-gray-100 text-gray-900 hover:bg-gray-200'} font-semibold py-3 transition-colors">{cta}</a>
</div>""")

    return f"""<section class="py-16 px-4 bg-gray-50">
  <div class="max-w-6xl mx-auto">
    <div class="text-center mb-12">
      <h2 class="text-3xl sm:text-4xl font-bold text-gray-900">{title}</h2>
      {f'<p class="mt-4 text-lg text-gray-600">{subtitle}</p>' if subtitle else ''}
    </div>
    <div class="grid grid-cols-1 md:grid-cols-{min(len(plans), 3)} gap-8 items-start">
      {''.join(plans_html)}
    </div>
  </div>
</section>"""


def _render_testimonial(props: dict) -> str:
    title = escape(props.get('title', 'What Our Clients Say'))
    testimonials = props.get('testimonials', [])
    layout = props.get('layout', 'grid')

    cards = []
    for t in testimonials:
        name = escape(t.get('name', ''))
        role = escape(t.get('role', ''))
        quote_text = escape(t.get('quote', ''))
        photo = t.get('photo', '')
        rating = int(t.get('rating', 5))
        stars = ''.join('<svg class="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg>' for _ in range(rating))
        avatar = f'<img src="{escape(photo)}" alt="{name}" class="w-12 h-12 rounded-full object-cover">' if photo else f'<div class="w-12 h-12 rounded-full bg-gray-300 flex items-center justify-center text-gray-600 font-bold">{name[:1]}</div>'

        cards.append(f"""<div class="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
  <div class="flex gap-1">{stars}</div>
  <p class="text-gray-700 italic">"{quote_text}"</p>
  <div class="flex items-center gap-3">
    {avatar}
    <div><div class="font-semibold text-gray-900">{name}</div><div class="text-sm text-gray-500">{role}</div></div>
  </div>
</div>""")

    grid_cls = 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6' if layout == 'grid' else 'flex gap-6 overflow-x-auto snap-x snap-mandatory pb-4'

    return f"""<section class="py-16 px-4">
  <div class="max-w-6xl mx-auto">
    <h2 class="text-3xl sm:text-4xl font-bold text-gray-900 text-center mb-12">{title}</h2>
    <div class="{grid_cls}">
      {''.join(cards)}
    </div>
  </div>
</section>"""


def _render_faq(props: dict) -> str:
    title = escape(props.get('title', 'Frequently Asked Questions'))
    subtitle = escape(props.get('subtitle', ''))
    faqs = props.get('faqs', [])

    items = []
    for i, faq in enumerate(faqs):
        q = escape(faq.get('question', ''))
        a = escape(faq.get('answer', ''))
        items.append(f"""<details class="group border-b border-gray-200">
  <summary class="flex items-center justify-between cursor-pointer py-4 text-left font-medium text-gray-900 hover:text-gray-700">
    <span>{q}</span>
    <svg class="w-5 h-5 text-gray-500 transition-transform group-open:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/></svg>
  </summary>
  <div class="pb-4 text-gray-600 leading-relaxed">{a}</div>
</details>""")

    return f"""<section class="py-16 px-4">
  <div class="max-w-3xl mx-auto">
    <div class="text-center mb-12">
      <h2 class="text-3xl sm:text-4xl font-bold text-gray-900">{title}</h2>
      {f'<p class="mt-4 text-lg text-gray-600">{subtitle}</p>' if subtitle else ''}
    </div>
    <div class="divide-y divide-gray-200 border-t border-gray-200">
      {''.join(items)}
    </div>
  </div>
</section>"""


def _render_footer(props: dict) -> str:
    company = escape(props.get('companyName', ''))
    logo = props.get('logo', '')
    links = props.get('links', [])
    social_links = props.get('socialLinks', [])
    copyright_text = escape(props.get('copyright', f'© 2026 {company}. All rights reserved.'))
    bg_color = escape(props.get('backgroundColor', '#111827'))

    logo_html = f'<img src="{escape(logo)}" alt="{company}" class="h-8">' if logo else f'<span class="text-xl font-bold text-white">{company}</span>'

    links_html = ' '.join(f'<a href="{escape(l.get("url", "#"))}" class="text-gray-400 hover:text-white transition-colors">{escape(l.get("label", ""))}</a>' for l in links)

    social_icons = {
        'facebook': '<path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>',
        'instagram': '<path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>',
        'twitter': '<path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>',
        'linkedin': '<path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>',
        'youtube': '<path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>',
        'tiktok': '<path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/>',
    }

    social_html = ''
    for sl in social_links:
        platform = sl.get('platform', '')
        url = escape(sl.get('url', '#'))
        icon_path = social_icons.get(platform, '')
        if icon_path:
            social_html += f'<a href="{url}" target="_blank" rel="noopener noreferrer" class="text-gray-400 hover:text-white transition-colors"><svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">{icon_path}</svg></a>'

    return f"""<footer class="py-12 px-4" style="background-color: {bg_color};">
  <div class="max-w-6xl mx-auto">
    <div class="flex flex-col md:flex-row items-center justify-between gap-6">
      <div>{logo_html}</div>
      <nav class="flex flex-wrap gap-6">{links_html}</nav>
      <div class="flex gap-4">{social_html}</div>
    </div>
    <div class="mt-8 pt-8 border-t border-gray-700 text-center text-gray-400 text-sm">{copyright_text}</div>
  </div>
</footer>"""


def _render_video(props: dict) -> str:
    video_url = props.get('videoUrl', '')
    thumbnail = props.get('thumbnailUrl', '')
    title = escape(props.get('title', ''))
    autoplay = props.get('autoplay', False)
    aspect_ratio = props.get('aspectRatio', '16:9')

    aspect_cls = {'16:9': 'aspect-video', '4:3': 'aspect-[4/3]', '1:1': 'aspect-square'}
    aspect = aspect_cls.get(aspect_ratio, 'aspect-video')

    embed_url = ''
    if 'youtube.com' in video_url or 'youtu.be' in video_url:
        vid = ''
        if 'youtu.be/' in video_url:
            vid = video_url.split('youtu.be/')[-1].split('?')[0]
        elif 'v=' in video_url:
            vid = video_url.split('v=')[-1].split('&')[0]
        if vid:
            embed_url = f'https://www.youtube.com/embed/{vid}{"?autoplay=1" if autoplay else ""}'
    elif 'vimeo.com' in video_url:
        vid = video_url.split('vimeo.com/')[-1].split('?')[0].split('/')[0]
        if vid:
            embed_url = f'https://player.vimeo.com/video/{vid}{"?autoplay=1" if autoplay else ""}'

    if not embed_url:
        return f'<section class="py-8 px-4"><div class="max-w-4xl mx-auto text-center text-gray-500">Invalid video URL</div></section>'

    return f"""<section class="py-12 px-4">
  <div class="max-w-4xl mx-auto">
    {f'<h2 class="text-2xl font-bold text-gray-900 text-center mb-6">{title}</h2>' if title else ''}
    <div class="{aspect} w-full rounded-xl overflow-hidden shadow-lg">
      <iframe src="{escape(embed_url)}" class="w-full h-full" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen loading="lazy"></iframe>
    </div>
  </div>
</section>"""


def _render_whatsapp_cta(props: dict) -> str:
    phone = ''.join(filter(str.isdigit, props.get('phoneNumber', '')))
    message = props.get('message', '')
    btn_text = escape(props.get('buttonText', 'Fale conosco no WhatsApp'))
    position = props.get('position', 'inline')
    size = props.get('size', 'md')
    bg_color = escape(props.get('backgroundColor', '#25D366'))

    encoded_msg = quote(message)
    wa_url = f"https://wa.me/{phone}{'?text=' + encoded_msg if message else ''}"

    icon = '<svg class="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.885 3.488"/></svg>'

    size_cls = {'sm': 'px-4 py-2 text-sm', 'md': 'px-6 py-3 text-base', 'lg': 'px-8 py-4 text-lg'}
    sz = size_cls.get(size, size_cls['md'])

    if position == 'floating':
        float_sz = {'sm': 'w-12 h-12', 'md': 'w-14 h-14', 'lg': 'w-16 h-16'}
        fsz = float_sz.get(size, float_sz['md'])
        return f"""<div class="fixed bottom-6 right-6 z-50">
  <a href="{escape(wa_url)}" target="_blank" rel="noopener noreferrer" class="inline-flex items-center justify-center rounded-full text-white shadow-lg hover:scale-110 transition-transform {fsz}" style="background-color: {bg_color};" aria-label="{btn_text}">{icon}</a>
</div>"""

    return f"""<section class="w-full py-8 px-4">
  <div class="max-w-4xl mx-auto text-center">
    <a href="{escape(wa_url)}" target="_blank" rel="noopener noreferrer" class="inline-flex items-center justify-center gap-3 rounded-lg text-white font-semibold hover:brightness-110 transition-all {sz}" style="background-color: {bg_color};">{icon}<span>{btn_text}</span></a>
  </div>
</section>"""


def _render_countdown(props: dict) -> str:
    target_date = escape(props.get('targetDate', ''))
    title = escape(props.get('title', 'Offer Ends In'))
    subtitle = escape(props.get('subtitle', ''))
    expired_msg = escape(props.get('expiredMessage', 'This offer has expired'))
    style = props.get('style', 'cards')
    bg_color = escape(props.get('backgroundColor', '#0f172a'))
    text_color = escape(props.get('textColor', '#ffffff'))

    uid = f"cd-{hash(target_date) % 100000}"

    if style == 'cards':
        display = f"""<div id="{uid}" class="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6">
  <div class="flex flex-col items-center"><div class="rounded-lg border border-white/20 bg-white/10 backdrop-blur-sm px-4 py-6 min-w-[80px]"><span class="text-3xl sm:text-5xl font-bold tabular-nums" style="color:{text_color}" data-unit="d">00</span></div><span class="mt-2 text-sm font-medium uppercase tracking-wider opacity-80" style="color:{text_color}">Days</span></div>
  <div class="flex flex-col items-center"><div class="rounded-lg border border-white/20 bg-white/10 backdrop-blur-sm px-4 py-6 min-w-[80px]"><span class="text-3xl sm:text-5xl font-bold tabular-nums" style="color:{text_color}" data-unit="h">00</span></div><span class="mt-2 text-sm font-medium uppercase tracking-wider opacity-80" style="color:{text_color}">Hours</span></div>
  <div class="flex flex-col items-center"><div class="rounded-lg border border-white/20 bg-white/10 backdrop-blur-sm px-4 py-6 min-w-[80px]"><span class="text-3xl sm:text-5xl font-bold tabular-nums" style="color:{text_color}" data-unit="m">00</span></div><span class="mt-2 text-sm font-medium uppercase tracking-wider opacity-80" style="color:{text_color}">Minutes</span></div>
  <div class="flex flex-col items-center"><div class="rounded-lg border border-white/20 bg-white/10 backdrop-blur-sm px-4 py-6 min-w-[80px]"><span class="text-3xl sm:text-5xl font-bold tabular-nums" style="color:{text_color}" data-unit="s">00</span></div><span class="mt-2 text-sm font-medium uppercase tracking-wider opacity-80" style="color:{text_color}">Seconds</span></div>
</div>"""
    else:
        display = f'<div id="{uid}" class="text-3xl sm:text-4xl font-bold tabular-nums tracking-wider" style="color:{text_color}"><span data-unit="d">00</span> : <span data-unit="h">00</span> : <span data-unit="m">00</span> : <span data-unit="s">00</span></div>'

    return f"""<section class="py-12 sm:py-16 px-4" style="background-color: {bg_color};">
  <div class="max-w-4xl mx-auto text-center">
    {f'<h2 class="text-2xl sm:text-4xl font-bold mb-4" style="color:{text_color}">{title}</h2>' if title else ''}
    {f'<p class="text-lg mb-8 opacity-90 max-w-2xl mx-auto" style="color:{text_color}">{subtitle}</p>' if subtitle else ''}
    <div class="flex justify-center">{display}</div>
    <div id="{uid}-expired" class="hidden text-2xl font-bold" style="color:{text_color}">{expired_msg}</div>
  </div>
</section>
<script>
(function(){{var t=new Date("{target_date}").getTime(),el=document.getElementById("{uid}"),ex=document.getElementById("{uid}-expired");if(isNaN(t))return;function u(){{var n=t-Date.now();if(n<=0){{el.style.display="none";ex.classList.remove("hidden");return}}var d=Math.floor(n/864e5),h=Math.floor(n%864e5/36e5),m=Math.floor(n%36e5/6e4),s=Math.floor(n%6e4/1e3);el.querySelector('[data-unit="d"]').textContent=String(d).padStart(2,"0");el.querySelector('[data-unit="h"]').textContent=String(h).padStart(2,"0");el.querySelector('[data-unit="m"]').textContent=String(m).padStart(2,"0");el.querySelector('[data-unit="s"]').textContent=String(s).padStart(2,"0")}}u();setInterval(u,1000)}})();
</script>"""


def _render_form_container(props: dict, forms_data: dict | None = None) -> str:
    form_id = props.get('formId', '')
    title = escape(props.get('title', 'Get Started Today'))
    description = escape(props.get('description', ''))
    bg_color = escape(props.get('backgroundColor', '#ffffff'))
    border_radius = escape(props.get('borderRadius', '0.75rem'))
    show_border = props.get('showBorder', True)
    max_width = props.get('maxWidth', 'md')

    max_w_cls = {'sm': 'max-w-sm', 'md': 'max-w-md', 'lg': 'max-w-2xl', 'full': 'max-w-full'}
    mw = max_w_cls.get(max_width, 'max-w-md')
    border_cls = 'border border-gray-200 shadow-sm' if show_border else ''

    if not form_id or not form_id.strip():
        return ''

    # Render actual form fields from FormSchema JSON Schema
    form_html = _build_form_html(form_id, forms_data)

    return f"""<div class="w-full py-8 px-4">
  <div class="{mw} mx-auto">
    <div class="w-full {border_cls} p-6" style="background-color: {bg_color}; border-radius: {border_radius};">
      {f'<div class="text-center mb-6"><h2 class="text-2xl font-bold text-gray-900">{title}</h2>{f"<p class=&quot;mt-2 text-gray-600&quot;>{description}</p>" if description else ""}</div>' if title or description else ''}
      {form_html}
    </div>
  </div>
</div>"""


def _build_form_html(form_id: str, forms_data: dict | None) -> str:
    """Generate HTML form from JSON Schema stored in FormSchema model."""
    if not forms_data or form_id not in forms_data:
        return f'<div class="text-center text-gray-500 py-4">Form not found</div>'

    form_info = forms_data[form_id]
    schema = form_info.get('schema', {})
    page_slug = form_info.get('page_slug', '')
    properties = schema.get('properties', {})
    required = schema.get('required', [])

    fields_html = []
    for key, prop in properties.items():
        label = escape(prop.get('title', key.replace('_', ' ').title()))
        field_type = prop.get('type', 'string')
        fmt = prop.get('format', '')
        is_required = key in required
        req_attr = 'required' if is_required else ''

        if field_type == 'string' and fmt == 'email':
            fields_html.append(f'<div class="space-y-1"><label class="block text-sm font-medium text-gray-700">{label}</label><input type="email" name="{escape(key)}" class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none" {req_attr}></div>')
        elif field_type == 'string' and 'enum' in prop:
            options = ''.join(f'<option value="{escape(str(v))}">{escape(str(v))}</option>' for v in prop['enum'])
            fields_html.append(f'<div class="space-y-1"><label class="block text-sm font-medium text-gray-700">{label}</label><select name="{escape(key)}" class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none" {req_attr}><option value="">Select...</option>{options}</select></div>')
        elif field_type == 'string' and prop.get('maxLength', 0) > 255:
            fields_html.append(f'<div class="space-y-1"><label class="block text-sm font-medium text-gray-700">{label}</label><textarea name="{escape(key)}" rows="3" class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none" {req_attr}></textarea></div>')
        elif field_type == 'boolean':
            fields_html.append(f'<div class="flex items-center gap-2"><input type="checkbox" name="{escape(key)}" class="rounded border-gray-300"><label class="text-sm text-gray-700">{label}</label></div>')
        elif field_type == 'number' or field_type == 'integer':
            fields_html.append(f'<div class="space-y-1"><label class="block text-sm font-medium text-gray-700">{label}</label><input type="number" name="{escape(key)}" class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none" {req_attr}></div>')
        else:
            input_type = 'tel' if 'phone' in key.lower() or 'telefone' in key.lower() or 'whatsapp' in key.lower() else 'text'
            fields_html.append(f'<div class="space-y-1"><label class="block text-sm font-medium text-gray-700">{label}</label><input type="{input_type}" name="{escape(key)}" class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none" {req_attr}></div>')

    form_action = f"/api/v1/pagecube/submit/{escape(page_slug)}/"

    return f"""<form id="pc-form-{escape(str(form_id))}" class="space-y-4" data-form-id="{escape(str(form_id))}" data-action="{form_action}">
  {''.join(fields_html)}
  <button type="submit" class="w-full rounded-lg bg-blue-600 text-white font-semibold py-3 hover:bg-blue-700 transition-colors">Submit</button>
  <div class="hidden text-center text-green-600 font-medium" data-success></div>
  <div class="hidden text-center text-red-600 text-sm" data-error></div>
</form>"""


# ---------------------------------------------------------------------------
# Block type → renderer mapping
# ---------------------------------------------------------------------------

BLOCK_RENDERERS = {
    'Hero': _render_hero,
    'CTA': _render_cta,
    'Pricing': _render_pricing,
    'Testimonial': _render_testimonial,
    'FAQ': _render_faq,
    'Footer': _render_footer,
    'Video': _render_video,
    'WhatsAppCTA': _render_whatsapp_cta,
    'Countdown': _render_countdown,
    'FormContainer': _render_form_container,
}


# ---------------------------------------------------------------------------
# Page assembler
# ---------------------------------------------------------------------------

def render_page_html(page) -> tuple[str, str]:
    """
    Render a Page's puck_data into (body_html, css).

    Returns:
        tuple: (html_body, css_string)
    """
    puck_data = page.puck_data or {}
    content = puck_data.get('content', [])

    # Pre-load form schemas for this page
    forms_data = _load_forms_data(page)

    blocks_html = []
    for block in content:
        block_type = block.get('type', '')
        props = block.get('props', {})
        renderer = BLOCK_RENDERERS.get(block_type)

        if renderer is None:
            logger.warning(f"Unknown block type '{block_type}' in page {page.id}")
            continue

        try:
            if block_type == 'FormContainer':
                html = renderer(props, forms_data)
            else:
                html = renderer(props)
            blocks_html.append(html)
        except Exception as e:
            logger.error(f"Error rendering block {block_type} in page {page.id}: {e}")
            blocks_html.append(f'<!-- Error rendering {block_type} -->')

    body_html = '\n'.join(blocks_html)

    # Add form submission script if page has forms
    if forms_data:
        body_html += _get_form_submission_script(page.slug)

    return body_html, ''


def _load_forms_data(page) -> dict:
    """Load all active FormSchemas for a page, keyed by str(id)."""
    from pagecube.models import FormSchema
    forms = FormSchema.objects.filter(page=page, is_active=True)
    result = {}
    for form in forms:
        result[str(form.id)] = {
            'schema': form.schema,
            'ui_schema': form.ui_schema,
            'page_slug': page.slug,
            'success_message': form.success_message,
            'redirect_url': form.redirect_url,
        }
    return result


def _get_form_submission_script(page_slug: str) -> str:
    """Inline JS for handling form submissions via fetch."""
    return f"""
<script>
document.querySelectorAll('form[data-form-id]').forEach(function(form){{
  form.addEventListener('submit',function(e){{
    e.preventDefault();
    var btn=form.querySelector('button[type="submit"]');
    var successEl=form.querySelector('[data-success]');
    var errorEl=form.querySelector('[data-error]');
    btn.disabled=true;btn.textContent='Sending...';
    successEl.classList.add('hidden');errorEl.classList.add('hidden');
    var data={{}};new FormData(form).forEach(function(v,k){{data[k]=v}});
    var params=new URLSearchParams(window.location.search);
    var qs='?';['utm_source','utm_medium','utm_campaign','utm_content','fbclid','gclid'].forEach(function(p){{if(params.get(p))qs+=p+'='+encodeURIComponent(params.get(p))+'&'}});
    fetch(form.dataset.action+(qs.length>1?qs:''),{{
      method:'POST',headers:{{'Content-Type':'application/json'}},
      body:JSON.stringify({{form_id:parseInt(form.dataset.formId),data:data}})
    }}).then(function(r){{return r.json().then(function(j){{return{{ok:r.ok,body:j}}}});}}).then(function(res){{
      if(res.ok){{
        form.reset();successEl.textContent=res.body.message||'Submitted!';successEl.classList.remove('hidden');
        if(res.body.redirect_url)setTimeout(function(){{window.location.href=res.body.redirect_url}},1500);
      }}else{{errorEl.textContent=res.body.detail||'Error submitting form';errorEl.classList.remove('hidden')}}
    }}).catch(function(){{errorEl.textContent='Network error. Please try again.';errorEl.classList.remove('hidden')}}).finally(function(){{btn.disabled=false;btn.textContent='Submit'}});
  }});
}});
</script>"""
