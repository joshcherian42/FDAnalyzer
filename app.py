from flask import Flask, render_template, make_response
from flask import redirect, request, jsonify, url_for
import json
import os
import pandas as pd
import numpy as np
import collections

app = Flask(__name__)
app = Flask(__name__)
app.secret_key = 's3cr3t'
app.debug = True

DRUG_PATH = "data/sample_data/bubble_viz/drug_nodes_sample.json" # TODO :  change this to real data later
EVENT_PATH = "data/all_events.csv"

SELECTED_DRUGS = []

DRUGS = None
ALL_EVENTS = None
SAMP_EVENTS = None

@app.route("/", methods=['GET'])
def index():
    if DRUGS is None:
        init_drug()
    if ALL_EVENTS is None:
        init_events()
    if SAMP_EVENTS is None:
        get_sample_drugs()
    # all_events = get_sample_drugs()
    # return render_template("index.html", drugs=DRUGS, events=all_events.to_dict())
    return render_template("index.html")


@app.route("/getdrugs", methods=["GET"])
def getDrugs():
    if DRUGS is None:
        init_drug()
    return jsonify(DRUGS)

@app.route("/getEvents", methods=["GET"])
def getEvents():
    global SAMP_EVENTS
    if SAMP_EVENTS is None:
        SAMP_EVENTS = get_sample_drugs()
    SAMP_EVENTS = SAMP_EVENTS[0:20]

    return jsonify(SAMP_EVENTS.to_json(orient='index'))


@app.route("/onSelect", methods=['POST'])
def onSelect():
    # drug_name = request.args.get("drug_name")
    print("ficl u json")

def init_drug():
    global DRUGS
    with open(DRUG_PATH, 'r') as handler:
        DRUGS = json.load(handler)

def init_events():
    global ALL_EVENTS
    ALL_EVENTS = pd.read_csv(EVENT_PATH)

def get_sample_drugs():
    global SAMP_EVENTS
    if ALL_EVENTS is None:
        init_events()
    if DRUGS is None:
        init_drug()
    all_events = pd.DataFrame()
    drug_pd = pd.read_json(DRUG_PATH)
    for events in drug_pd.event_ids:
        # for e in events:
        temp = ALL_EVENTS[ALL_EVENTS['id'].isin(events)]
        all_events = all_events.append(temp, ignore_index=True)
    SAMP_EVENTS = all_events


if __name__ == '__main__':
    init_drug()
    init_events()
    app.run(host='0.0.0.0', port=8888)