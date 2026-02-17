"""
Auto-import all handler modules so they self-register via @NodeRegistry.register.
"""
from . import triggers      # noqa: F401
from . import logic          # noqa: F401
from . import actions        # noqa: F401
from . import ai             # noqa: F401
from . import messaging      # noqa: F401
from . import router         # noqa: F401
from . import data           # noqa: F401
from . import subworkflow    # noqa: F401
