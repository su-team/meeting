

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
    this.refs = {};
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
    let { audio,video } = this //push 流
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

    let { stream_list } = this

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

Emedia.prototype.streamBindVideo = function(refs) {
    if(!refs) {
        return
    }
    this.refs = refs
    let { stream_list } = this
    stream_list.map(item => {
        if( item ){

            let { id } = item.stream;
            let el = refs[`list-video-${id}`];

            let { stream, member } = item;
            if( stream.located() ){
                emedia.mgr.streamBindVideo(stream, el);
            }else {
                emedia.mgr.subscribe(member, stream, true, true, el)
            }
        }
    });

    // 当bind stream to video 就监听一下video
    this._on_media_chanaged();
}

//监听音视频变化
Emedia.prototype._on_media_chanaged = function() {

    console.log('_on_media_chanaged');
    
   let _this = this;
   for (const key in this.refs) {
       let el = this.refs[key];
       let stream_id = key.split('-')[2];
       emedia.mgr.onMediaChanaged(el, function (constaints) {
           _this.set_stream_item_changed(constaints, stream_id)
       });
   } 
}

Emedia.prototype.set_stream_item_changed = function(constaints, id) {
    if(!id || !constaints) {
        return
    }


    let { stream_list } = this
    let { aoff,voff } = constaints
    stream_list = stream_list.map(item => {
        if(
            item &&
            item.stream &&
            item.stream.id == id
        ){
            item.stream.aoff = aoff
            item.stream.voff = voff
        }

        return item
    })

    console.log('set_stream_item_changed',stream_list);
    
    this.setState({ stream_list })
}

Emedia.prototype.set_audio = function(audio){
    this.setState({ audio })
}

Emedia.prototype.toggle_audio = async function() {
    let { role } = this.user_room;
    let { own_stream } = this;
    if(role == 1){
        return
    }

    if(!own_stream) {
        return
    }

    let { audio } = this
    if(audio){
        await emedia.mgr.pauseAudio(own_stream);
        audio = !audio
        this.setState({ audio })
    }else {
        await emedia.mgr.resumeAudio(own_stream);
        audio = !audio
        this.setState({ audio })
    }
}

Emedia.prototype.set_video = function(video){
    this.setState({ video })
}
Emedia.prototype.toggle_video = async function() {
    let { role } = this.user_room;
    let { own_stream } = this;
    if(role == 1){
        return
    }

    if(!own_stream) {
        return
    }

    let { video } = this;

    if(video){
        await emedia.mgr.pauseVideo(own_stream);
        video = !video
        this.setState({ video })
    }else {
        await emedia.mgr.resumeVideo(own_stream);
        video = !video
        this.setState({ video })
    }
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