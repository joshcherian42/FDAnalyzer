import os

from decoder import Decoder
import json

class FDADataset:
    def __init__(self, path=".", batch_size=1, multiprocessing=True):
        """ this class constructs a generator for the fda dataset, making it possible to load an entire dataset
        without taking too much RAM space
        :param path       : path to event folder
        :param batch_size : the number of unique id  return for every loop
        :param multiprocessing : whether to use multiprocessing or not
        """
        self.root = path
        self.multiprocessing = multiprocessing
        self.file_paths = []
        for f in os.listdir(self.root):
            f_p = os.path.join(self.root, f)
            for sub_event in os.listdir(f_p):
                self.file_paths.append(os.path.join(f_p, sub_event))

        self.file_ptr = -1

        self.decoder = Decoder()
        self.json_events = []
        if batch_size == 0:
            raise ValueError("Batch size cannot be 0")
        self.batch_size = batch_size

    def __iter__(self):
        return self

    def __next__(self):
        if self.file_ptr >= len(self.file_paths):
            raise StopIteration
        else:
            if len(self.json_events) < self.batch_size:
                self.load_next_json()
            mini_batch = self.json_events[0:self.batch_size+1]
            self.json_events = self.json_events[self.batch_size+1::]
            return self.decoder.decode(mini_batch, multiprocessing=self.multiprocessing)

    def load_next_json(self):
        try:
            self.file_ptr += 1
            json_path = self.file_paths[self.file_ptr]
            file = json.load(open(json_path, 'r'))
            self.json_events.extend(file['results'])
        except IndexError:
            raise StopIteration
