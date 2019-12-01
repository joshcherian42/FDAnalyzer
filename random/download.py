from multiprocessing.pool import Pool

import requests
import os
import tqdm
import zipfile
import json

def download(arg):
	"""download file at url and save at dir """
	url, directory = arg
	r = requests.get(url, allow_redirects=True)
	open(directory, 'wb').write(r.content)
	with zipfile.ZipFile(directory, 'r') as zip_ref:
		zip_ref.extractall(os.path.dirname(directory))
	os.remove(directory)


def get_download_links(path):
	"""obtain all download links from fdc's provided download json"""
	with open(path, 'r') as handle:
		file = json.load(handle)
	drugs = file['results']["drug"]
	links = []
	for k in drugs.keys():
		sub_section = drugs[k]
		for p in sub_section['partitions']:
			links.append(p['file'])
	return links


if __name__ == "__main__":
	links = get_download_links("download.json")
	args = []
	for url in links:
		infos = url.split("/")
		infos = infos[3:] # getting rid of https and website
		# now we reconstruct the path
		path = ''
		for i in infos:
			path = os.path.join(path, i)
			if i.endswith('.zip'):
				break
			else:
				if not os.path.exists(path):
					os.mkdir(path)
		path = path.strip("\n")
		# filename = filename.strip("\n")
		url = url.strip("\n")
		# sub_dir = os.path.join(root_path, time)
		# if not os.path.isdir(sub_dir):
		# 	os.mkdir(sub_dir)
		args.append([url, path])
		# download(url, os.path.join(sub_dir, filename))
	p = Pool()
	list(tqdm.tqdm(p.imap(download, args), ascii=True, total=len(args)))


