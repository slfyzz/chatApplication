
let user = ""
let currChannel = ""
// some templates
const messagetemplate = Handlebars.compile(document.querySelector('#messageTemp').innerHTML);
const channelTemplate = Handlebars.compile(document.querySelector('#channelTemp').innerHTML);
const channelDetailsTemp = Handlebars.compile(document.querySelector("#memberTemp").innerHTML);


// some registers
Handlebars.registerHelper('ifEquals', function(arg1, arg2, options) {
    return (arg1 == arg2) ? options.fn(this) : options.inverse(this);
});

Handlebars.registerHelper('ifNEquals', function(arg1, arg2, options) {
    return (arg1 != arg2) ? options.fn(this) : options.inverse(this);
});

document.addEventListener("DOMContentLoaded", () => {

    // current User and the channel
    user = localStorage.getItem('userName');
    currChannel = "";

    if (localStorage.getItem('currentChannel') != null)
        currChannel = localStorage.getItem('currentChannel');

    // move the screen to the last message
    moveToBottom(document.querySelector('#messages'));

    // socket variable
    var socket = io.connect(location.protocol + '//' + document.domain + ':' + location.port);

    // disable the send button at first
    document.querySelector('#send').disabled = true;


    // dont enable the send button until there's a message
    document.querySelector('#message').onkeyup = event => {

        if (event.keyCode === 13 && !document.querySelector('#send').disabled) {
            document.querySelector('#send').click();
        }

        document.querySelectorAll('.deleteButtons').forEach( button => {
            button.style.visibility = 'hidden';
        
        });

        if (document.querySelector('#message').value.length > 0 && currChannel != "")
            document.querySelector('#send').disabled = false;
        else
            document.querySelector('#send').disabled = true;

    };


    //if delete button is clicked
    document.querySelector('#deleteMessages').onclick = () => {

        document.querySelectorAll('.deleteButtons').forEach(button => {
            button.style.visibility = 'visible';
        });
    };

    // adjust the form of new channel to check if the channel name is available or not
    document.querySelector('#channelName').onkeyup = () => {

        const channelName = document.querySelector('#channelName').value;
        document.querySelector('#helpName').style.visibility = 'hidden';
        
        if (channelName.length == 0)
            document.querySelector('#createChannel').disabled = true;
        
        const request = new XMLHttpRequest();
        request.open('POST', '/checkChannel');
        request.onload = () => {
            const response = JSON.parse(request.responseText);
            if (!response.available) {
                document.querySelector('#createChannel').disabled = true;
                document.querySelector('#helpName').style.visibility = 'visible';
            }
            else 
            document.querySelector('#createChannel').disabled = false;
            document.querySelector('#helpName').style.visibility = 'hidden';
        };

        const data = new FormData();
        data.append('channel', channelName);
        request.send(data);

    };


    // on socketConnect
    socket.on('connect', () => {
        
        document.querySelector('#send').onclick = () => {
            
            const message = document.querySelector('#message').value;
            if (message.length == 0)
                return;

            socket.emit("sendMessage", {'message' : message, 'channel' : currChannel});
            document.querySelector('#message').value = '';
            return false;
        };

        // add channel to the channelList
        document.querySelector('#createChannel').onclick = () => {
            
            const channelName = document.querySelector('#channelName').value;
            const channelDetails = document.querySelector('#description').value;
            socket.emit('newChannel', {'channelName' : channelName, 'channelDetails': channelDetails});
            return false;
        };

        // send file 
        document.querySelector('#sendFile').addEventListener('click', function() {
            

            if (currChannel == "")
                return;

            console.log(currChannel)

            const form = document.querySelector('#uploadForm');
            const file = form[0].files[0];

            console.log(file)
            if (file == undefined)
                return;

            const name = file.name;
            const lastDot = name.lastIndexOf('.');

            const fileName = name.substring(0, lastDot);
            const ext = name.substring(lastDot + 1);
            socket.emit('sendFile', {'data': file, 'fileName':fileName, 'format':ext, 'channel':currChannel});
            return false;
        });

        // for classes
        document.addEventListener('click', e => {

            const element = e.target;
            const className = String(element.className);

            // if there's a request to get into a channel
            if (className.includes('channels')) {        
                const request = new XMLHttpRequest();
                request.open('POST', '/channel')
                request.onload = () => {
                    const response = JSON.parse(request.responseText);
                    loadChannelDetails(response);
                    moveToBottom(document.querySelector('#messages'));
                };
                const data = new FormData();
                data.append('channelName', element.innerHTML);
                console.log(element.innerHTML);
                document.querySelector('#messages').innerHTML = "";
                document.title = element.innerHTML;
                currChannel = element.innerHTML.trim();
                localStorage.setItem('currentChannel', currChannel);
                request.send(data);
                return false;
            }


            // if there's a request to get a file
            else if (className.includes('file')) {

                fileName = element.innerHTML.trim();

                const request = new XMLHttpRequest();
                request.open('GET', `/getFile/${fileName}`);
                console.log(fileName);
                request.responseType = "blob";
                request.setRequestHeader("Content-type", "application/x-www-form-urlencoded");

                request.onload = () => {
                    saveByteArray(fileName, request.response);
                    console.log(request.response)
                };

                request.send();
            }
            
            // if there's a request to delete message
            else if (className.includes('deleteButtons')) {


                const messageText = element.parentElement;
                const sender = messageText.children[0].innerHTML.trim();
                const messageBody = messageText.children[2].children[0];
                const time = messageBody.title;
                const txt = messageBody.innerHTML.trim();
                let isFile = false;
                if (messageBody.className.includes('file'))
                    isFile = true;
                socket.emit('deleteMessage', {'channel': currChannel,'sender': sender, 'time':time, 'text': txt, 'isFile':isFile});
            }
        });



    });

    // receiving a new message in real time
    socket.on('newMessage', data => {
        const response = JSON.parse(data);
        
        if (response.channel != currChannel)
            return;
        
        document.querySelector('#messages').innerHTML += messagetemplate({'contents' : [response], 'user':user});
        addToChatAdj(response);
    });

    // if there's a new file is arrived
    socket.on('newFile', data => {

        const response = data;
        const msg = JSON.parse(response.file);
 
        if (currChannel != "" && msg.channel != currChannel && response.success == "success")
            return;
        
        document.querySelector('#messages').innerHTML += messagetemplate({'contents' : [msg], 'user':user});
        addToChatAdj(msg);
    });

    //receiving a new channel in real time
    socket.on('newChannel', data => {
        document.querySelector('#channelsList').innerHTML += channelTemplate({'channel': data});
    });

    socket.on('deleteMessageNotify', data => {

        if (data.channel != currChannel)
            return;
        
        try {    
            document.querySelectorAll('.messageText').forEach(msgText => {
                const messageBody = msgText.children[2].children[0];
                console.log(msgText);
                if (data.sender == msgText.children[0].innerHTML.trim() &&
                    data.time == messageBody.title &&
                    data.text == messageBody.innerHTML.trim() &&
                    ((messageBody.className.includes('file') && data.isFile) || !data.isFile)) {
                        
                        console.log(msgText);
                        const parent = msgText.parentElement;
                        parent.style.animation = 'delete';
                        parent.style.animationPlayState = 'running';
                        parent.style.animationDuration = '2s';
                        parent.addEventListener('animationend', () =>  {
                            parent.style.opacity = 0;
                            parent.remove();
                        });
                        throw true;
                }
            });
        }
        catch (e) {
            console.log(e);
            console.log("DONE");
        }     
    });

    // relink with file input
    document.querySelector('#fileExplorer').onclick = () => {

        document.querySelector('#fileBrowser').click();
    };

    document.querySelector('#fileBrowser').addEventListener('change', relink);
});


function relink () {
    document.querySelector('#sendFile').click();
    document.querySelector('#fileBrowser').addEventListener('change' , relink);
}


// move to the bottom of a page
function moveToBottom(messages) {
    messages.scrollTop = messages.scrollHeight + 16;
}


function loadChannelDetails(channel) {

    document.querySelector('#channelDetails').innerHTML = channelDetailsTemp({'channel': channel});
    loadMsg(channel);
}

function loadMsg(content) {
    document.querySelector('#messages').innerHTML += messagetemplate({'contents' : JSON.parse(content.messages), 'user': user});
    
}

function addToChatAdj(response) {
            
    const message = document.querySelector('#messages').lastElementChild;
    if (user == response.sender)
        moveToBottom(document.querySelector('#messages'));
        
    message.style.animation = 'grow';
    message.style.animationPlayState = 'running';
    message.style.animationDuration = '0.1s';
    message.addEventListener('animationend', () =>  {
        message.style.removeProperty('animation');
        message.style.animationPlayState = '';
    });      
        
    if (user == response.sender)
        moveToBottom(document.querySelector('#messages'));    
    console.log(user);
}

// download link
function saveByteArray(reportName, byte) {
    var blob = new Blob([byte], {type: "application/jpg"});
    var link = document.createElement('a');
    link.href = window.URL.createObjectURL(blob);
    var fileName = reportName;
    link.download = fileName;
    link.click();
}


