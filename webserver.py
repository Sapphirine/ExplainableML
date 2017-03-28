import numpy as np
import pandas as pd
from pprint import pprint
from flask import Flask, request, send_from_directory, json
from sklearn import svm
from sklearn.metrics import accuracy_score
from sklearn.metrics import f1_score
from sklearn.metrics import precision_score
from sklearn.metrics import recall_score
from sklearn.metrics import confusion_matrix
from sklearn.metrics import hinge_loss
from sklearn.multiclass import OneVsRestClassifier
from sklearn.metrics import precision_recall_curve
from sklearn.preprocessing import label_binarize
import json
from urllib.request import urlopen
from urllib.parse import urlparse, parse_qs
import os.path

app = Flask(__name__, static_url_path='')
			
@app.route('/mytest')
def hello():
    return "Hello World!"

def chunks(l):
    for i in range(0, len(l)):
        yield l[i]
		
def root_dir():  # pragma: no cover
    return os.path.abspath(os.path.dirname(__file__))
	
@app.route('/', methods=['GET'])
def send_index():
    return app.send_static_file('index.html')

@app.route('/css/<path:path>', methods=['GET'])
def send_css(path):
    return send_from_directory('css', path)
	
@app.route('/assets/<path:path>', methods=['GET'])
def send_js(path):
    return send_from_directory('assets', path)
		
@app.route('/data/<path:path>', methods=['GET'])
def send_data(path):
    return send_from_directory('data', path)
		
@app.route('/node_modules/<path:path>', methods=['GET'])
def send_node_modules(path):
    return send_from_directory('node_modules', path)
	
@app.route('/runsvm/<set>', methods = ['POST'])
def runsvm(set):
	print("DataSet: " + set)
	print("parameters for SVM: " + json.dumps(request.json))
	
	_kernel = request.json['kernel']
	_gamma = request.json['gamma']
	_C = request.json['penalty']
	_degree = request.json['degree']
	
    #_kernel = request.form['kernel']
    #_C	= request.form['c']
    #_gamma = request.form['gamma']
	nClasses = 10
	trainData = pd.read_csv(os.path.join(root_dir(), 'data/mnist_train.csv'), sep=',',header=None)
	trainLabel = pd.read_csv(os.path.join(root_dir(), 'data/mnist_train_label.csv'), sep=',',header=None)
	trainLabelBinary = label_binarize(trainLabel, classes=np.array(range(nClasses)))
	testData = pd.read_csv(os.path.join(root_dir(), 'data/mnist_test.csv'), sep=',',header=None)
	testLabel = pd.read_csv(os.path.join(root_dir(), 'data/mnist_test_label.csv'), sep=',',header=None)
	testLabelBinary = label_binarize(testLabel, classes=np.array(range(nClasses)))
	#random_state = np.random.RandomState(0)
	clt = svm.SVC(kernel=_kernel, C=_C, degree=_degree)
	classifier = OneVsRestClassifier(clt)
	clt.fit(trainData, trainLabel)
	classifier.fit(trainData, trainLabelBinary)
	precision = dict()
	recall = dict()
	precisionJson = ""
	recallJson = ""
	if set == "test" :
		pred = clt.predict(testData)
		f1Score = f1_score(testLabel, pred, average=None)
		cm = confusion_matrix(testLabel, pred)
		accuracy = accuracy_score(testLabel, pred)
		precisionScore = precision_score(testLabel, pred, average=None)
		recallScore = recall_score(testLabel, pred, average=None)
		#hingeLoss = hinge_loss(testLabel, pred)
		dec = classifier.decision_function(testData)
		for i in range(nClasses):
			precision[i], recall[i], _ = precision_recall_curve(testLabelBinary[:,i], dec[:, i])
			precisionJson += json.dumps(np.round(precision[i],3).tolist())
			recallJson += json.dumps(np.round(recall[i],3).tolist())
			if i != nClasses - 1:
				precisionJson += ", "
				recallJson += ", "
	else :
		pred = clt.predict(trainData)
		f1Score = f1_score(trainLabel, pred, average=None)
		cm = confusion_matrix(trainLabel, pred)
		accuracy = accuracy_score(trainLabel, pred)
		precisionScore = precision_score(trainLabel, pred, average=None)
		recallScore = recall_score(trainLabel, pred, average=None)
		#hingeLoss = hinge_loss(trainLabel, pred)
		dec = classifier.decision_function(trainData)
		for i in range(nClasses):
			precision[i], recall[i], _ = precision_recall_curve(trainLabelBinary[:,i], dec[:, i])
			precisionJson += json.dumps(np.round(precision[i],3).tolist())
			recallJson += json.dumps(np.round(recall[i],3).tolist())
			if i != nClasses - 1 :
				precisionJson += ", "
				recallJson += ", "
		
	return "{\"result\": " + json.dumps(pred.tolist()) + ",\"f1_score\": " + json.dumps(np.round(f1Score,3).tolist()) \
		+ ",\"confusion\": " + json.dumps(cm.tolist()) + ",\"accuracy_score\": " + json.dumps(np.round(accuracy,3).tolist()) \
		+ ", \"precision_score\": " + json.dumps(np.round(precisionScore,3).tolist()) \
		+ ", \"recall_score\": " + json.dumps(np.round(recallScore,3).tolist()) \
		+ ", \"precision_curve\": ["+ precisionJson + "],\"recall_curve\": [" + recallJson \
		+ "]" + "}"
		
		#+ ", \"hinge_loss\": " + json.dumps(np.round(hingeLoss,3).tolist()) \

if __name__ == '__main__':
  app.run(debug=True)

