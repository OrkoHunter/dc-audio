import codecs
import json
import time
import os

import requests

headers = {
    "authorization": "MY-SECRET-KEY",
    "content-type": "application/json"
}


def follow(thefile):
    thefile.seek(0, 2)
    while True:
        line = thefile.readline()
        if not line:
            time.sleep(0.1)
            continue
        yield line


def parse_data(line):
    """
    Types of events
    1. Join    -> $MyINFO
    2. Quit    -> $Quit
    3. Search  -> $Search
    """
    log = line.strip()

    # We don't need to process logs with these keywords
    noise = ('#[VIPChat]', '#[ModzChat]', '*message*')
    noisy = any(item in log for item in noise)

    if '*debug*' not in log:
        noisy = True

    if noisy:
        return False, {}

    log_array = log.split(' ')
    time = log_array[1]

    if '$MyINFO' in log:
        user = log_array[len(log_array) - 2]
        returnData = {
            'type': 'JOIN',
            'user': user,
            'time': time
        }
        return True, returnData
    elif '$Quit' in log:
        user = log_array[len(log_array) - 1][:-1]
        returnData = {
            'type': 'QUIT',
            'user': user,
            'time': time
        }
        return True, returnData
    elif '$Search' in log:
        if 'TTH:' in log:
            returnData = {
                'type': 'SEARCH',
                'query': '',
                'time': time
            }
            return True, returnData
        else:
            queryArray = log_array[len(log_array) - 1].split('?')
            query = queryArray[len(queryArray) - 1]
            query = query.replace('$', ' ')[:-1]
            returnData = {
                'type': 'SEARCH',
                'query': query,
                'time': time
            }
            return True, returnData
    elif '$SR' in log:
        user = log_array[6]
        returnData = {
            'type': 'SHARE',
            'user': user,
            'time': time
        }
        return True, returnData
    else:
        return False, {}


logfile_path = os.path.expanduser('~') + '/.ncdc/stderr.log'
logfile = codecs.open(logfile_path, 'r', 'utf-8', errors='ignore')
loglines = follow(logfile)

for line in loglines:
    success, data = parse_data(line)
    if success:
        log = json.dumps({"data": data})
        r = requests.post('https://kgpdcaudio.herokuapp.com/data', data=log, headers=headers)
        # r = requests.post('http://localhost:5000/data', data=log, headers=headers)
        print(r.ok)
        print(time.strftime("--> %H:%M:%S"))
