import time

import numpy as np
from flask import Flask, render_template
from flask import request, jsonify
from flask_compress import Compress

import threading
from collections import Counter
import json
import pandas as pd

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
    return render_template("index.html")

@app.route("/visualization", methods=['GET'])
def viz_index():
    return render_template("visualization.html")

@app.route("/getdrugs", methods=["GET", "POST"])
def getDrugs():

    if threads[-1].isAlive():
        threads[-1].join()

    if request.method == "GET":
        global DRUG_EVENTS
        DRUG_EVENTS = DRUG_EVENTS[DRUG_EVENTS['event_ids'].astype(str) != '[]']

        return jsonify(DRUG_EVENTS['brand_name'].tolist())
    else:
        print(request.json['data'])
        return jsonify([])


@app.route("/getevents", methods=["POST"])
def getEvents():
    # get selected drugs

    if threads[1].isAlive():
        threads[1].join()
    t = time.time()

    try:
        data = request.json['data']
        selected_drugs = data['selected_drugs']
        threshold = data['threshold']
    except (TypeError, AttributeError) as e:
        selected_drugs = request.json['data']
        threshold = 1

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
    #drugs = EVENTS.loc[EVENTS.id.isin(events)].dropna()

    events = EVENTS.loc[EVENTS.id.isin(events)]
    events = events.set_index("id")
    events['rgb'] = events.apply(lambda row: translate(row), axis=1)

    drug_colors = {}
    for i in range(len(events.index)):
        drugs = events.iat[i, 0]
        rgb = events.iat[i, -1]
        for i in drugs.split(','):
            all_drugs.append(i)
            if i not in drug_colors:
                drug_colors[i] = np.array(rgb)
            else:
                drug_colors[i] += rgb

    count = Counter(all_drugs)
    most_common_count = count.most_common(1)[-1][-1]
    drug_colors = {k:v for k, v in drug_colors.items() if count[k] > threshold}
    count = {k:v for k, v in count.items() if v > threshold}
    for drug in count:
        # print(type(drug_colors[drug]), count[drug])
        drug_colors[drug] = drug_colors[drug] / count[drug]
        drug_colors[drug] = drug_colors[drug].tolist()

    if len(count.keys()) > 1000:
        count_thresh = {k:v for k,v in count.items() if v >= 5}
    else:
        count_thresh = count

    print ("time taken to complete: ", time.time()-t)
    return jsonify({"count": count_thresh, "max_count": most_common_count, "num_drugs": len(all_drugs),
                    "drugs": events.drugs.tolist(), "events": events.to_dict("index"),  "color": drug_colors})


def translate(row):
    if row['death'] == 1: # highest
        return [255.0,13.0,5.0, 1.0]
    elif row['hospital'] == 1: # 4
        return [255.0,13.0,5.0, 0.4]
    elif row['disability'] == 1: # 3
        return [255.0,13.0,5.0, 0.6]
    elif row['lifethreaten'] == 1: # 2
        return [255.0,13.0,5.0, 0.8]
    else:
        return [255.0,13.0,5.0, 0.2]


def getRGB(events, drugs):
    drug_color = pd.DataFrame(columns=["id", "rgb", "total"])
    drug_color['id'] = drugs
    drug_color['rgb'] = [np.zeros(3) for _ in range(len(drugs))]
    drug_color['total'] = [0] * len(drugs)
    drug_color = drug_color.set_index("id")

    def assign_color(row):
        mask = drug_color.index.isin(row.drugs.split(','))
        drug_color.loc[mask, "rgb"] = drug_color.loc[mask, "rgb"].apply(lambda x: x + row.rgb)
        drug_color.loc[mask, "total"] += 1

    events.apply(lambda row: assign_color(row), axis=1)

    drug_color['rgb'] /= drug_color['total']
    drug_color['rgb'] = drug_color.rgb.apply(lambda x: x.tolist())
    return drug_color.to_dict('index')

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


if __name__ == '__main__':
    # init_drug()
    # init_events()
    init()
    app.run(host='0.0.0.0', port=8888)
