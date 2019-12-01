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
        return jsonify(DRUGS)
    else:
        print('hey')
        print(request.json['data'])
        return jsonify([])


def _init():
    print("Initializing DB")
    global DRUGS, EVENTS, DRUG_EVENTS
    DRUGS = pd.read_csv(DRUG_PATH)
    EVENTS = pd.read_csv(EVENT_PATH)
    DRUG_EVENTS = pd.read_csv(DRUG_EVENTS)



if __name__ == '__main__':
    init_drug()
    init_events()
    app.run(host='0.0.0.0', port=8888)