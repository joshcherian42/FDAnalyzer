from flask import Flask, render_template
from flask import request, jsonify
from flask_compress import Compress

import threading
from collections import Counter
import json
import pandas as pd
import gzip

app = Flask(__name__)
Compress(app)
threads = []

app.secret_key = 's3cr3t'
app.debug = True
app.config.setdefault('COMPRESS_ALGORITHM', "gzip")
DRUG_PATH = "data/medicine_dataset.csv" # TODO :  change this to real data later
EVENT_PATH = "data/all_events.csv"
DRUG_EVENT_PATH = "data/drug_nodes.csv"

DRUGS = None
EVENTS = None
DRUG_EVENTS = None


@app.route("/", methods=['GET'])
def index():
    init()
    return render_template("index.html")


@app.route("/getdrugs", methods=["GET", "POST"])
def getDrugs():

    if threads[-1].isAlive():
        threads[-1].join()

    if request.method == "GET":
        global DRUG_EVENTS
        DRUG_EVENTS = DRUG_EVENTS[DRUG_EVENTS['event_ids'].astype(str) != '[]']

        return jsonify(DRUG_EVENTS['brand_name'].tolist()[0:20])
    else:
        print(request.json['data'])
        return jsonify([])


@app.route("/getevents", methods=["POST"])
def getEvents():
    # get selected drugs

    if threads[1].isAlive():
        threads[1].join()

    selected_drugs = request.json['data']
    # get events between these drugs
    print("selected drugs: ", selected_drugs)
    if len(selected_drugs) == 0:
        return jsonify([])
    events_mask = EVENTS.drugs.apply(lambda x: set(selected_drugs).issubset(x.split(',')))

    events = EVENTS[events_mask].id.tolist()

    all_drugs = []
    # events = list(events)
    print("sample of events : ", len(events))
    print("some events: ", events[0:20])
    drugs = EVENTS.loc[EVENTS.id.isin(events)].dropna()
    drugs = drugs.drugs.tolist()
    for d in drugs:
        d = [i.strip(' ') for i in d.split(',')]
        all_drugs.extend(d)

    print("number of events ", len(events))
    print("number of drugs ", len(all_drugs))
    count = Counter(all_drugs)
    events = EVENTS.loc[EVENTS.id.isin(events)]
    events = events.set_index("id")
    data = jsonify({"count": count, "events": events.to_dict("index")})
    return data


def init():
    print("Initializing DB")
    global threads
    t1 = threading.Thread(target=_init_drugs, daemon=True)
    t2 = threading.Thread(target=_init_events, daemon=True)
    t3 = threading.Thread(target=_init_drug_events, daemon=True)
    threads = [t1, t2, t3]
    for t in threads:
        t.start()


def _init_drugs():
    global DRUGS
    DRUGS = pd.read_csv(DRUG_PATH)


def _init_events():
    global EVENTS
    EVENTS = pd.read_csv(EVENT_PATH)
    EVENTS = EVENTS.dropna()

def _init_drug_events():
    global DRUG_EVENTS
    DRUG_EVENTS = pd.read_csv(DRUG_EVENT_PATH)


def compress(data):
    json_str = json.dumps(data) + "\n"
    json_bytes = json_str.encode("utf-8")
    return gzip.compress(json_bytes)


if __name__ == '__main__':
    # init_drug()
    # init_events()

    app.run(host='0.0.0.0', port=8888)
