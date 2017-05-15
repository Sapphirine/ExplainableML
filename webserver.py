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
from sklearn.preprocessing import scale
import json
from urllib.request import urlopen
from urllib.parse import urlparse, parse_qs
import os.path
import datetime

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
	global models
	global models_classifier
	global XtrainData
	global XtestData
	global trainLabel
	global testLabel
	global trainLabelBinary
	global testLabelBinary
	
	print("DataSet: " + set)
	print("parameters for SVM: " + json.dumps(request.json))
	
	_kernel = request.json['kernel']
	_gamma = request.json['gamma']
	_C = request.json['penalty']
	_degree = request.json['degree']
	paramStr = _kernel + ":" + str(_gamma) + ":" + str(_C) + ":" + str(_degree)
	
    #_kernel = request.form['kernel']
    #_C	= request.form['c']
    #_gamma = request.form['gamma']
	nClasses = 10
	if paramStr not in models:
		print("Run model " + str(datetime.datetime.now()))
		trainData = pd.read_csv(os.path.join(root_dir(), 'data/mnist_train.csv'), sep=',',header=None)
		XtrainData = scale( trainData, axis=0, with_mean=True, with_std=True, copy=True )
		trainLabel = pd.read_csv(os.path.join(root_dir(), 'data/mnist_train_label.csv'), sep=',',header=None)
		trainLabelBinary = label_binarize(trainLabel, classes=np.array(range(nClasses)))
		testData = pd.read_csv(os.path.join(root_dir(), 'data/mnist_test.csv'), sep=',',header=None)
		XtestData = scale( testData, axis=0, with_mean=True, with_std=True, copy=True )
		testLabel = pd.read_csv(os.path.join(root_dir(), 'data/mnist_test_label.csv'), sep=',',header=None)
		testLabelBinary = label_binarize(testLabel, classes=np.array(range(nClasses)))
		#random_state = np.random.RandomState(0)
		clt = svm.SVC(kernel=_kernel, C=_C, degree=_degree)
		classifier = OneVsRestClassifier(clt)
		clt.fit(XtrainData, trainLabel)
		classifier.fit(XtrainData, trainLabelBinary)
		models[paramStr] = clt
		models_classifier[paramStr] = classifier
		XData["train"] = XtrainData
		XData["test"] = XtestData
		Label["train"] = trainLabel
		Label["test"] = testLabel
		LabelBinary["train"] = trainLabelBinary
		LabelBinary["test"] = testLabelBinary
	else:
		print("Retrieve models from dictionary " + str(datetime.datetime.now()))
		clt = models[paramStr]
		classifier = models_classifier[paramStr]
		
	precision = dict()
	recall = dict()
	precisionJson = ""
	recallJson = ""
	
	if paramStr in preds and set in preds[paramStr]:
		print("Retrieve prediction from dictionary " + str(datetime.datetime.now()))
		pred = preds[paramStr][set]
	else:
		print("Run prediction " + str(datetime.datetime.now()))
		pred = clt.predict(XData[set])
		preds[set] = pred
	
	if paramStr in performance and set in performance[paramStr]:
		print("Retr]ieve performance matrix from dictionary " + str(datetime.datetime.now()))
		f1Score = performance[paramStr][set]["f1Score"]
		cm = performance[paramStr][set]["cm"]
		accuracy = performance[paramStr][set]["accuracy"]
		precisionScore = performance[paramStr][set]["precisionScore"]
		recallScore = performance[paramStr][set]["recallScore"]
		dec = performance[paramStr][set]["dec"]
	else:
		print("Run performance matrix " + str(datetime.datetime.now()))
		f1Score = f1_score(Label[set], pred, average=None)
		cm = confusion_matrix(Label[set], pred)
		accuracy = accuracy_score(Label[set], pred)
		precisionScore = precision_score(Label[set], pred, average=None)
		recallScore = recall_score(Label[set], pred, average=None)
		#hingeLoss = hinge_loss(testLabel, pred)
		dec = classifier.decision_function(XData[set])
		#performance[paramStr][set] = {}
		if paramStr not in performance:
			performance[paramStr] = {}
		if set not in performance[paramStr]:
			performance[paramStr][set] = {}
		performance[paramStr][set]["f1Score"] = f1Score
		performance[paramStr][set]["cm"] = cm
		performance[paramStr][set]["accuracy"] = accuracy
		performance[paramStr][set]["precisionScore"] = precisionScore
		performance[paramStr][set]["recallScore"] = recallScore
		performance[paramStr][set]["dec"] = dec
	
	for i in range(nClasses):
		precision[i], recall[i], _ = precision_recall_curve(LabelBinary[set][:,i], dec[:, i])
		precisionJson += json.dumps(np.round(precision[i],3).tolist())
		recallJson += json.dumps(np.round(recall[i],3).tolist())
		if i != nClasses - 1:
			precisionJson += ", "
			recallJson += ", "
			
	#if set == "test":		
	#else :
	#	for i in range(nClasses):
	#		precision[i], recall[i], _ = precision_recall_curve(LabelBinary[test][:,i], dec[:, i])
	#		precisionJson += json.dumps(np.round(precision[i],3).tolist())
	#		recallJson += json.dumps(np.round(recall[i],3).tolist())
	#		if i != nClasses - 1 :
	#			precisionJson += ", "
	#			recallJson += ", "
		
	return "{\"result\": " + json.dumps(pred.tolist()) + ",\"f1_score\": " + json.dumps(np.round(f1Score,3).tolist()) \
		+ ",\"confusion\": " + json.dumps(cm.tolist()) + ",\"accuracy_score\": " + json.dumps(np.round(accuracy,3).tolist()) \
		+ ", \"precision_score\": " + json.dumps(np.round(precisionScore,3).tolist()) \
		+ ", \"recall_score\": " + json.dumps(np.round(recallScore,3).tolist()) \
		+ ", \"precision_curve\": ["+ precisionJson + "],\"recall_curve\": [" + recallJson \
		+ "]" + "}"
		
		#+ ", \"hinge_loss\": " + json.dumps(np.round(hingeLoss,3).tolist()) \

		
models = {}
models_classifier = {}
XData = {}
Label = {}
LabelBinary = {}
preds = {}
performance = {}

if __name__ == '__main__':
  app.run(debug=True)

