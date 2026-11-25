"""Local development entry point; .env stays private. Docker Compose loads it itself."""
import os
from pathlib import Path
from urllib.parse import quote
root = Path(__file__).resolve().parent
for line in (root / '.env').read_text().splitlines():
    if line and not line.startswith('#'):
        key, value = line.split('=', 1)
        os.environ.setdefault(key, value)
os.environ.setdefault('DATABASE_URL', 'postgresql://pulsar:' + quote(os.environ['POSTGRES_PASSWORD'], safe='') + '@localhost:' + os.environ.get('DB_PORT','55432') + '/pulsar')
if __name__ == '__main__':
    import sys
    if len(sys.argv) > 1:
        from pulsar.cli import main
        main()
    else:
        from pulsar.web import create_app
        create_app().run(host='0.0.0.0', port=int(os.environ.get('APP_PORT','5055')), debug=False)
