import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "server", "flask-api"))

from app import create_app

app = create_app()
