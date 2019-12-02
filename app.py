from flask import Flask, render_template
from flask import request, jsonify
from collections import Counter
import json
import pandas as pd

app = Flask(__name__)
app = Flask(__name__)
app.secret_key = 's3cr3t'
app.debug = True

DRUG_PATH = "data/medicine_dataset.csv" # TODO :  change this to real data later
EVENT_PATH = "data/all_events.csv"
DRUG_EVENT_PATH = "data/drug_events.csv"

DRUGS = None
EVENTS = None
DRUG_EVENTS = None


@app.route("/", methods=['GET'])
def index():
    _init()
    return render_template("index.html")


@app.route("/getdrugs", methods=["GET", "POST"])
def getDrugs():
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
    selected_drugs = request.json['data']
    # get events between these drugs
    print("selected drugs: ", selected_drugs)
    if selected_drugs:
        events_mask = EVENTS.drugs.apply(lambda x: set(selected_drugs).issubset(x.split(',')))

        events = EVENTS[events_mask].id.tolist()

        all_drugs = []

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
        return jsonify({"count": count, "events": events.to_dict("index")})
    else:
        return jsonify({"count": {}, "events": {}})


def _init():
    print("Initializing DB")
    global DRUGS
    global EVENTS
    global DRUG_EVENTS
    global SELECTED_DRUGS
    DRUGS = pd.read_csv(DRUG_PATH)
    EVENTS = pd.read_csv(EVENT_PATH)
    DRUG_EVENTS = pd.read_csv(DRUG_EVENT_PATH)
    EVENTS = EVENTS.dropna()


if __name__ == '__main__':
    # init_drug()
    # init_events()
    app.run(host='0.0.0.0', port=8888)
