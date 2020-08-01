from json import JSONEncoder


class Channel():
    def __init__(self, name, describ):
        self.name = name
        self.members = []
        self.messages = []
        self.describ = describ

    def addMessage(self, message):
        if (len(self.messages) > 100):
            del self.messages[0]
        self.messages.append(message)
    
    def addMember(self, member):
        self.members = member

    def map(self):
        return {'name' : self.name, 'members' : self.members, 'messages': MessageEncoder().encode(self.messages), 'details' : self.describ}


class Message():
    def __init__(self, message, channel, time, sender, isFile=False, securedFileName=''):
        self.text = message
        self.channel = channel
        self.time = time
        self.sender = sender
        self.isFile = isFile
        self.securedFileName = securedFileName


class MessageEncoder(JSONEncoder):
        def default(self, o):
            return o.__dict__