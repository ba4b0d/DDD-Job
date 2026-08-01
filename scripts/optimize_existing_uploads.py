"""
CLI tool wrapper to compress and optimize all existing product images to WebP format.
Delegates to app.optimize_existing_uploads.main().
"""
import os
import sys

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend")))

from app.optimize_existing_uploads import main

if __name__ == "__main__":
    main()
