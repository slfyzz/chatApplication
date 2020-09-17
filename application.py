import os
import datetime
from flask import Flask, session, render_template, jsonify, request, redirect, abort, flash,send_file, send_from_directory, safe_join, url_for, make_response
from flask_session import Session
from modules import Channel, Message, MessageEncoder
from flask_socketio import SocketIO, emit
from werkzeug.utils import secure_filename
import random
import base64
import secrets




app = Flask(__name__)
app.config["SECRET_KEY"] = secrets.token_urlsafe(16)
UPLOAD_FOLDER = 'path\\uploads'
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024

socketio = SocketIO(app)


#holds all participants
names = set()
channelsLs = {} #dict with (key : name of the channel, value : the channel obj)
files = set() # holds all files names


@app.route("/")
def index():
    if session.get('userName') is None: # if he is not registered
        return render_template('login.html')
    else: 
        return redirect('/channels')


@app.route("/channels", methods=["POST", "GET"])
def channels():
    #check if he's just coming from reg page
    if request.method == "POST" or session.get('currentChannel') is None:
        name = request.form.get('userName') 
        session['userName'] = name
        names.add(name)
        return render_template('index.html', title='Flack' ,channels=list(channelsLs), user=name, log=True)
    #if he registered before
    elif request.method == "GET":
        name = session.get('userName')
        channel = session.get('currentChannel')
    #if the name is missed
    if name is None :
        redirect(url_for('index'))

    if not(name in names):
        names.add(name)
        session['userName'] = name
        
    return render_template('index.html', log=True, title='first' ,channels=list(channelsLs), messages=(channelsLs[channel].messages), channel=channelsLs[channel], user=name)


#check if the name is available
@app.route("/check", methods=["POST"])
def check(): 
    return {'available' : not (request.form.get('userName') in names)}

#check if the channel name is available
@app.route("/checkChannel", methods=["Post"])
def checkChannel():
    return {'available' : not (request.form.get('channel') in channelsLs)}
 
#push a channel
@app.route("/channel", methods=["POST"])
def getChannel():
    channelName = str(request.form.get('channelName')).strip()
    session['currentChannel'] = channelName
    if session.get('userName') not in channelsLs[channelName].members:
        channelsLs[channelName].members.append(session.get('userName'))
    return channelsLs[channelName].map()

#get file from the server
@app.route("/getFile/<string:fileName>")
def getFile(fileName):
    
    if fileName is None:
        return jsonify({'success': 'failed'}), 404

    
    filePath = os.path.join(app.config['UPLOAD_FOLDER'], fileName)
    print(filePath)
    pathred, ext = os.path.splitext(os.path.join(app.config['UPLOAD_FOLDER'], fileName))

    if os.path.isfile(filePath):
        return send_file(filePath, mimetype=f'application/{ext}', as_attachment=True, attachment_filename=fileName)

    else:
        return jsonify({'success': 'failed'}), 404

#upload file to the server
@socketio.on("sendFile")
def saveFile(data):

    file = data['data']
    formatFile = data['format']
    fileName = data['fileName']

    if file and formatFile and fileName and data['channel']:

        while fileName in files:
            fileName += str(random.randrange(0, 1024, 1))

        securedFileName = secure_filename(f"{fileName}.{formatFile}")
        files.add(securedFileName)
        filePath = os.path.join(app.config['UPLOAD_FOLDER'], securedFileName)
        channel = data['channel']
        session['currentChannel'] = channel

        newMessage = Message(filePath, channel, str(datetime.datetime.now().strftime("%m/%d/%Y, %H:%M:%S")), session.get('userName'), True, securedFileName)
        channelsLs[channel].addMessage(newMessage)

        open(os.path.join(app.config['UPLOAD_FOLDER'], securedFileName), 'wb').write(file)
        #file.save(os.path.join(app.config['UPLOAD_FOLDER'], filename))
        emit('newFile', {'success': 'success', 'file': MessageEncoder().encode(newMessage) }, broadcast=True)
    else :
        emit('newFile', {'success': 'failed'}, broadcast=True)
    

    
#save a message in channel object
@socketio.on("sendMessage")
def updateChat(data):
    message = data['message']
    channel = data['channel']
    session['currentChannel'] = channel

    newMessage = Message(message, channel, str(datetime.datetime.now().strftime("%m/%d/%Y, %H:%M:%S")), session.get('userName'))
    channelsLs[channel].addMessage(newMessage)
    emit("newMessage", MessageEncoder().encode(newMessage) , broadcast=True)


@socketio.on('newChannel')
def addChannel(data):
    channelName = data['channelName']
    if channelName is None or channelName in channelsLs:
        abort(404)
    newChannel = Channel(channelName, str(data['channelDetails'] or f'#{channelName}'))
    newChannel.members.append(session.get('userName'))
    channelsLs[channelName] = newChannel
    emit('newChannel', {"channelName" : channelName}, broadcast=True)


@socketio.on('deleteMessage')
def deleteMessage(data):
    
    sender = data['sender']
    channel = data['channel']
    txt = data['text']
    time = data['time']
    print(data)

    if channel in channelsLs and sender in names:
        currentChannel = channelsLs[channel]

        if len(currentChannel.messages) == 0:
            return

        for msg in currentChannel.messages:
            if msg.sender == sender and msg.time == time and ((msg.isFile and msg.securedFileName == txt) or (msg.text == txt)):
                currentChannel.messages.remove(msg)
                break
        
        emit('deleteMessageNotify', data, broadcast=True)

