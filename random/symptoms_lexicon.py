import os
import json
import tqdm
from multiprocessing import Pool
from itertools import chain

def process(file_path):
    symptoms = set()
    with open(file_path, 'r') as handle:
        data = json.load(handle)
        events = data['results']
        for event in events:
            try:
                reactions = event['patient']['reaction']
                for reaction in reactions:
                    symptoms.add(reaction['reactionmeddrapt'].lower())
            except KeyError:
                continue
    return symptoms

if __name__ == "__main__":
    root_path = os.path.join('drug', 'event')
    files = []

    for dir in os.listdir(root_path):
        curr_path = os.path.join(root_path, dir)
        for file in os.listdir(curr_path):
            files.append(os.path.join(curr_path, file))

    p = Pool()
    results = list(tqdm.tqdm(p.imap(process, files), total=len(files)))
    p.close()
    p.join()
    results = set().union(*results)
    lexicon = {k:i for i,k in enumerate(results)}
    with open("symptoms.json", 'w') as handle:
        json.dump(lexicon, handle)
