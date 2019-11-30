from flask import Flask, render_template, make_response
from flask import redirect, request, jsonify, url_for
import json
import os
import pandas as pd
import numpy as np

app = Flask(__name__)
app = Flask(__name__)
app.secret_key = 's3cr3t'
app.debug = True

DRUG_PATH = "data/sample_data/bubble_viz/drug_nodes_sample.json" # TODO :  change this to real data later
EVENT_PATH = "data/sample_data/sample/events.json"
DRUGS = None
EVENTS = None


@app.route("/", methods=['GET'])
def index():
    if DRUGS is None:
        init_drug()
    if EVENTS is None:
        init_events()
    return render_template("index.html", data=DRUGS)

@app.route("/getdrugs", methods=["GET"])
def getDrugs():
    if DRUGS is None:
        init_drug()
    return jsonify(DRUGS)

@app.route("/getevents", methods=["GET"])
def getEvents():
    if EVENTS is None:
        init_events()
    return jsonify(EVENTS)

def init_drug():
    global DRUGS
    with open(DRUG_PATH, 'r') as handler:
        DRUGS = json.load(handler)

def init_events():
    global EVENTS
    with open(EVENT_PATH, 'r') as handler:
        EVENTS = json.load(handler)

if __name__ == '__main__':
    init_drug()
    init_events()
    app.run(host='0.0.0.0', port=8888)