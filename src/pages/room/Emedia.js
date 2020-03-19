

import emedia from 'easemob-emedia';
import { message } from 'antd';

function Emedia() {
    this.joined = false
    this.user_room = {
        role: undefined
    }
    this.stream_list = []
    this.own_stream = null
    this.audio = true
    this.video = true
    this.talker_is_full = false //主播已满

    this.init()
}

Emedia.prototype.init = function() {
    let _this = this;
    
    emedia.config({
        restPrefix: process.env.REACT_APP_RTC_HOST
    });
    emedia.mgr.onStreamAdded = function (member, stream) {
        console.log('onStreamAdded >>>', member, stream);

        _this._on_stream_added(member, stream)
    };
    emedia.mgr.onStreamRemoved = function (member, stream) {
        console.log('onStreamRemoved',member,stream);

        _this._on_stream_removed(stream)
    };
    emedia.mgr.onMemberJoined = function (member) {
        console.log('onMemberJoined',member);
        message.success(`${member.nickName || member.name} 加入了会议`);
    };

    emedia.mgr.onMemberLeave = function (member, reason, failed) {
        console.log('onMemberLeave', member, reason, failed);
        message.success(`${member.nickName || member.name} 退出了会议`);
    };
    
}

Emedia.prototype.join = async function(params){
    try {
        const user_room = await emedia.mgr.joinRoom(params);

        this.setState({ 
            joined: true,
            user_room
        })
        this.publish();

    } catch (error) { 
        if(error.error == -200){//主播人数已满
            this.setState({ talker_is_full: true })
        }
    }
}
Emedia.prototype.publish = function() {
    
    let { role } = this.user_room
    if(role == 1){//观众不推流
        return
    }
    let { audio,video } = this //push 流取off(关) 的反值
    emedia.mgr.publish({ audio, video });
}

Emedia.prototype._on_stream_added = function(member, stream) {
    if(!member || !stream) {
        return
    }

    let { stream_list } = this

    if(stream.located()) {//自己 publish的流，添加role 属性
        this.setState({own_stream: stream});

        let { role } = this.user_room;
        member.role = role;
        member.is_me = true;
    }
    stream_list.push({ stream, member })

    this.setState({ stream_list })
} 
Emedia.prototype._on_stream_removed = function(stream) {
    if(!stream){
        return
    }

    let { stream_list } = this.state

    stream_list.map((item, index) => {
        if(
            item &&
            item.stream && 
            item.stream.id == stream.id 
        ) {
            stream_list.splice(index, 1)
        }
    });

    this.setState({ stream_list })
}

Emedia.prototype.setState = function(obj) {
    if(
        !obj ||
        Object.keys(obj).length == 0
    ) {
        return
    }

    for (const key in obj) {
        this[key] = obj[key];
        this[`${key}_changed`] && this[`${key}_changed`]();//调用相应回调函数
    }
}
export default Emedia;