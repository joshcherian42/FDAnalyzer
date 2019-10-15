from multiprocessing.pool import Pool

import requests
import os
import tqdm
import zipfile


def download(arg):
	"""download file at url and save at dir """
	url, directory = arg
	r = requests.get(url, allow_redirects=True)
	open(directory, 'wb').write(r.content)
	with zipfile.ZipFile(directory, 'r') as zip_ref:
		zip_ref.extractall(os.path.dirname(directory))
	os.remove(directory)


if __name__ == "__main__":

	root_path = os.path.join("drug", "event")

	if not os.path.isdir("drug"):
		os.mkdir("drug")
		os.mkdir(root_path)
	args = []
	with open("file_path.txt", 'r') as f:
		for url in f.readlines():
			*_, time, filename = url.split("/")
			filename = filename.strip("\n")
			url = url.strip("\n")
			sub_dir = os.path.join(root_path, time)
			if not os.path.isdir(sub_dir):
				os.mkdir(sub_dir)
			args.append([url, os.path.join(sub_dir, filename)])
			# download(url, os.path.join(sub_dir, filename))
	p = Pool()
	list(tqdm.tqdm(p.imap(download, args), ascii=True, total=len(args)))


