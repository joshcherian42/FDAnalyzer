import tqdm
import yaml
import os
import sys
import json
import pandas as pd
import datetime
from itertools import product
from multiprocessing import pool, Pool

DEBUG = False

NDC = "NDC_fields.yaml"
ADV = "Adverse_Event_fields.yaml"


class Decoder:
    def __init__(self):
        """ Decoder decodes event(s) and returns a Dataframe
        """
        # ndc_path = os.path.join(root_dir, NDC)
        # adv_path = os.path.join(root_dir, ADV)
        # if not os.path.isfile(ndc_path) or not os.path.isfile(adv_path):
        #   raise OSError("Unable to locate {} and {}".format(ndc_path, adv_path))

        self.sex = {0: 'unknown', 1: "Male", 2: "Female"}

        self.characterization = {
            1: "Suspect (the drug was considered by the reporter to be the cause)",
            2: "Concomitant (the drug was reported as being taken along with the suspect drug)",
            3: "Interacting (the drug was considered by the reporter to have interacted with the suspect drug)"
        }
        self.serious = {
            1: "The adverse event resulted in death, a life threatening condition, hospitalization, disability, \
            congenital anomaly, or other serious condition",
            2: "The adverse event did not result in any of the above"}
        self.death = {
            0: "survive",
            1: "death"
        }
        self.sender = {
            1: "Physician",
            2: "Pharmacist",
            3: "Other health professional",
            4: "Lawyer",
            5: "Consumer or non-health professional",
            0: "unknown"
        }

        self._symptom = json.load(open("symptoms.json", 'r'))
        self.symptom = {v: k for k, v in self._symptom.items()}

        # self.ndc = yaml.safe_load(open(ndc_path, "rb"))
        # self.adv = yaml.safe_load(open(adv_path, "rb"))

        self.columns = [
            "ID", "sex", "age", "symptom", "drug", "components", "characterization", "serious", "death", "sender",
            "Time"
        ]

    def decode(self, events, df=None, verbose=False):
        """
        decode translates event or events into agree upon format and return a dataframe created from the input event or events
        :param events: a list of event
        :param df: existing dataframe. if not given, a new data frame will be created, else append to this data frame
        :return: Dataframe
        """
        if type(events) != list:
            raise TypeError("input to decode must be a list")
        if df:
            if df.columns != self.columns:
                raise TypeError("input dataFrame does not conform to Decoder's standard")
        else:
            df = pd.DataFrame(columns=self.columns)

        p = Pool()
        if verbose:
            results = list(tqdm.tqdm(p.imap(self._decode, events)))
        else:
            results = list(p.map(self._decode, events))
        p.close()
        p.join()

        if DEBUG:
            print(len(results))
            print(results[0])

        for frame in results:
            df = df.append(frame, ignore_index=True)
        return df

    def look_up(self, value, col_name):
        try:
            attr = self.__getattribute__(col_name)
            return attr[value]
        except AttributeError:
            raise AttributeError("{} does not exist or yet to be implemented".format(col_name))

    def _decode(self, event):
        iid = self._get_id(event)
        sex = self._get_sex(event)
        age = self._get_age(event)
        symtomps = self._get_symtomps(event)
        drugs, components, characteriation = self._get_drugs(event)
        seriousness = self._get_seriousness(event)
        sender = self._get_sender(event)
        time = self._get_time(event)

        if DEBUG:
            print("iid : {}".format(iid))
            print("sex : {}".format(sex))
            print("age : {}".format(age))
            print("syms: {}".format(symtomps))
            print("drug: {}".format(drugs))
            print("comp: {}".format(components))
            print("char: {}".format(characteriation))
            print("seri: {}".format(seriousness))
            print("send: {}".format(sender))
            print("time: {}".format(time))

        drug_profiles = [i for i in zip(drugs, components, characteriation)]

        if DEBUG:
            print("drug profiles: {}".format(drug_profiles))
        df = pd.DataFrame(columns=self.columns)
        for combination in product(symtomps, drug_profiles):
            if DEBUG:
                print("combination: {}".format(combination))
            sym, drug_profile = combination
            drug, components, characteriation = drug_profile
            row = pd.DataFrame(columns=self.columns, data=[[
                iid,
                sex,
                age,
                sym,
                drug,
                components,
                characteriation,
                seriousness[0],
                seriousness[1],
                sender,
                time,
            ]])
            df = df.append(row, ignore_index=True)
        return df

    @staticmethod
    def _get_id(event):
        return event['safetyreportid']

    @staticmethod
    def _get_time(event):
        try:
            time = event['receiptdate']
            timestamp = datetime.datetime(int(time[0:4]), int(time[4:6]), int(time[6::]), 0, 0).timestamp()
            return timestamp
        except KeyError:
            return -1

    @staticmethod
    def _get_age(event):
        to_year = {
            '800': 10,
            '801': 1,
            '802': 1 / 12,
            '803': 1 / (12 * 4),
            '804': 1 / 365,
            '805': 1 / 8760,
        }
        try:
            age = event['patient']['patientonsetage']
            unit = event['patient']["patientonsetageunit"]
            return int(age) * to_year[unit]
        except KeyError:
            return -1

    @staticmethod
    def _get_sex(event):
        try:
            sex = event['patient']['patientsex']
            return int(sex)
        except KeyError:
            return 0

    def _get_symtomps(self, event):
        try:
            syms = []
            for sym in event['patient']["reaction"]:
                syms.append(self._symptom[sym['reactionmeddrapt'].lower()])
            return syms
        except KeyError:
            return []

    @staticmethod
    def _get_drugs(event):
        try:
            drugs = []
            components = []
            characterization = []
            for i in event['patient']['drug']:
                drugs.append(i['medicinalproduct'])
                if 'openfda' in i:
                    if 'rxcui' in i['openfda']:
                        components.append(i['openfda']['rxcui'])
                    else:
                        components.append([])
                else:
                    components.append([])
                if 'drugcharacterization' in i:
                    characterization.append(i['drugcharacterization'])
                else:
                    characterization.append(-1)
            return drugs, components, characterization
        except KeyError:
            return [], [], []

    @staticmethod
    def _get_seriousness(event):
        seriousness_attributes = [
            "serious",
            # "seriousnesscongenitalanomali",
            "seriousnessdeath",
            # "seriousnessdisabling",
            # "seriousnesshospitalization",
            # "seriousnesslifethreatening",
            # "seriousnessother",
        ]
        results = [0 for _ in range(len(seriousness_attributes))]
        for i, attr in enumerate(seriousness_attributes):
            if attr in event:
                results[i] = event[attr]
        return results

    @staticmethod
    def _get_sender(event):
        try:
            sender = event['primarysource']['qualification']
            return sender
        except (TypeError, KeyError):
            return 0


if __name__ == "__main__":
    import json

    events = json.load(open("drug/event/2004q1/drug-event-0001-of-0005.json", 'r'))
    event = events['results']
    print(len(event))
    # print(event)
    event = event[0:100]
    decoder = Decoder()
    info = decoder.decode(event, verbose=True)
    print(info.head(100))
    print(len(info.index))
