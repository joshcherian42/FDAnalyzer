import requests
import os
import tqdm


def download(url, directory):
	"""download file at url and save at dir """
	r = requests.get(url, allow_redirects=True)
	open(directory, 'wb').write(r.content)


if __name__ == "__main__":

	root_path = os.path.join("drug", "event")

	if not os.path.isdir("drug"):
		os.mkdir("drug")
		os.mkdir(root_path)

	with open("file_path.txt", 'r') as f:
		for url in tqdm.tqdm(f.readlines()):
			*_, time, filename = url.split("/")
			filename = filename.strip("\n")
			url = url.strip("\n")
			sub_dir = os.path.join(root_path, time)
			if not os.path.isdir(sub_dir):
				os.mkdir(sub_dir)
			download(url, os.path.join(sub_dir, filename))


