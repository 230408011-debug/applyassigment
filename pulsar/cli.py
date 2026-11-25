import argparse
import json
from .db import initialize, import_dataset
from .ml import train_all

def main():
    parser = argparse.ArgumentParser(description='Pulsar Scout database and ML commands')
    parser.add_argument('command', choices=['init-db','import-data','train'])
    parser.add_argument('--seed', type=int, default=42)
    args = parser.parse_args()
    if args.command == 'init-db':
        initialize(); print('Schema ready')
    elif args.command == 'import-data':
        print(json.dumps(import_dataset()))
    else:
        print(json.dumps(train_all(args.seed), indent=2))

if __name__ == '__main__':
    main()
