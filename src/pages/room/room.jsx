import React, {Component} from 'react' 


import { 
    Layout,
    Button,
    Icon,
    Modal,
    Form,
    Input,
    Checkbox,
    Row,
    message,
    Tooltip,
    Drawer,
    Popconfirm
} from 'antd';
import './room.less';


import emedia from 'easemob-emedia';
import login from './login.js'

// assets
const requireContext = require.context('../../assets/images', true, /^\.\/.*\.png$/)// 通过webpack 获取 img
const get_img_url_by_name = (name) => {
    if(!name){
        return
    }
    let id = requireContext.resolve(`./${name}.png`);

    return __webpack_require__(id);
}


const Item = Form.Item 

const { Header, Content, Footer } = Layout;

class RoomHeader extends Component {

    state = {
        time: 0
    }
    componentDidMount(){
        // this.startTime()
    }
    componentWillUnmount() {
        clearInterval(this.timeID);
    }
    startTime() {
        let _this = this;
        this.timeID = setInterval(
            () => {
                _this.setState(state => ({
                    time:state.time + 1
                }))
            },
            1000
        )
    }
    _get_tick() {
        let { time } = this.state

        function get_second(second){
            return second<10 ? ('0'+second) : second
        }
        function get_minute(minute){
            return minute<10 ? ('0'+minute) : minute
        }
        let time_str = ''
        if(time < 60){
            time_str = '00:' + get_second(time)
        }else if(time >= 60){
            let minute = get_minute(parseInt(time/60));
            let surplus_second = get_second(time%60)
            time_str = minute +':'+ surplus_second
        }
        return time_str
    }
    
    leave = () => {

        let is_confirm = window.confirm('确定退出会议吗？');

        if(is_confirm){
            emedia.mgr.exitConference();
            window.location.reload()
        }
        
    }

    render() {
        let { roomName, stream_list } = this.props;
        let admin = '';
        stream_list.map(item => {
            
            if(
                item &&
                item.member && 
                item.member.role == 7
            ) {
                admin = item.member.name.slice(-5);
                return
            }
        })

        return (
            <Header>
                <div className="info">
                    <div>
                        <img src={get_img_url_by_name('logo-text-room')}/>
                    </div>
                    <div style={{lineHeight:1}}>
                        <div>
                            <Tooltip title={'主持人: ' + (admin)} placement="bottom">
                                <img src={get_img_url_by_name('admin-icon')} style={{marginTop:'-5px'}}/>
                            </Tooltip>
                            {/* <span>network</span> */}
                            <span className="name">{roomName}</span>
                        </div>
                        <div className="time">{this._get_tick()}</div>
                    </div>

                    <div onClick={this.leave} style={{cursor: 'pointer',color:'#EF413F'}}>
                        <img src={get_img_url_by_name('leave-icon')} />
                        <span>离开房间</span>
                    </div>
                </div>
            </Header>

        )
    }
}

class TalkerList extends Component {

    state = {
        show:false
    }
    componentDidMount() {
        this.streamBindVideo()
    }
    componentDidUpdate() {
        this.streamBindVideo()
    }
    toggle = () => {
        let { show } = this.state;
        this.setState({
            show:!show
        })
    }
    streamBindVideo = () => {
        
        let { stream_list } = this.props;

        let _this = this;
        stream_list.map(item => {
            if( item ){

                let { id } = item.stream;
                let el = _this.refs[`list-video-${id}`];
    
                let { stream, member } = item;
                if( stream.located() ){
                    emedia.mgr.streamBindVideo(stream, el);
                }else {
                    emedia.mgr.subscribe(member, stream, true, true, el)
                }
            }
        });
    }
    render() {

        let _this = this;
        let { stream_list } = this.props;
        let { show } = this.state
        function get_talkers() {
            let talkers = 0;
            let { stream_list } = _this.props;
            stream_list.map(item => {
                if(
                    item &&
                    item.stream &&
                    item.stream.type != emedia.StreamType.DESKTOP
                ){ //null 的不计数 共享桌面不计数
                    talkers++
                }
            })
            return talkers
        }
    
        return (
            <Drawer 
                title={`主播${get_talkers()} 观众0`}
                placement="right"
                closable={false}
                visible={show}
                mask={false}
                getContainer={false}
                width="336px"
            >
                <img 
                    src={get_img_url_by_name('expand-icon')} 
                    className={'toggle-icon ' + (show ? 'collapse' : 'expand')}
                    onClick={this.toggle}
                 />
                { stream_list.map((item) => {
                    if( item ){
                        let { id } = item.stream
                        return (
                            <div 
                                key={id} 
                                className="item"
                            >
                                <video ref={`list-video-${id}`} autoPlay></video>
                            </div>
                        )
                    }
                }) }
            </Drawer>
        )
    }
}

class RoomFooter extends Component {

    state = {
        video:this.props.video, //便于组建内操作
        audio:this.props.audio,
        shared_desktop: false
    }
    // 关闭或开启自己的
    async toggle_video() {

        let { role } = this.props.user_room;
        let { own_stream } = this.props;
        let { video } = this.state;
        if(role == 1){
            return
        }

        if(!own_stream) {
            return
        }

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
    async toggle_audio() {
        let { role } = this.props.user_room;
        let { own_stream } = this.props;
        if(role == 1){
            return
        }

        if(!own_stream) {
            return
        }

        let { audio } = this.state
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
    async share_desktop() {
        try {
            let _this = this; 

            var options = {
                stopSharedCallback: () => _this.stop_share_desktop()
            }
            await emedia.mgr.shareDesktopWithAudio(options);
            
            this.setState({ shared_desktop:true });
        } catch (err) {
            if( //用户取消也是 -201 所以两层判断
                err.error == -201 &&
                err.errorMessage.indexOf('ShareDesktopExtensionNotFound') > 0
            ){
                message.error('请确认已安装共享桌面插件 或者是否使用的 https域名');
            }
        }
    }

    stop_share_desktop() {
        let { stream_list } = this.props;

        stream_list.map((item) => {
            if(
                item &&
                item.stream &&
                item.stream.type == emedia.StreamType.DESKTOP
            ){
                emedia.mgr.unpublish(item.stream);
            }
        })
        
        this.setState({ 
            shared_desktop:false
        });
    }
    render() {
        let { role } = this.props.user_room
        let { audio, video, shared_desktop} = this.state
        
        return (
            <Footer>

                <div className="actions-wrap">

                    {/* <img src={get_img_url_by_name('apply-icon')} style={{visibility:'hidden'}}/> */}
                    <div className="actions">
                        {
                            <Tooltip title={ audio ? '静音' : '解除静音'}>
                                <img src={audio ? 
                                            get_img_url_by_name('audio-is-open-icon') : 
                                            get_img_url_by_name('audio-is-close-icon')} 
                                        onClick={() => this.toggle_audio()}/>
                            </Tooltip>
                            
                        }
                        {
                            <Tooltip title={ video ? '关闭视频' : '开启视频'}>
                                <img style={{margin:'0 10px'}}
                                    src={video ? 
                                        get_img_url_by_name('video-is-open-icon') : 
                                        get_img_url_by_name('video-is-close-icon')} 
                                    onClick={() => this.toggle_video()}/>
                            </Tooltip>
                        }
                        {
                            role == 1 ? 
                            <Tooltip title='申请上麦'>
                                <img 
                                    src={get_img_url_by_name('apply-to-talker-icon')} 
                                    onClick={() => this.apply_talker()}
                                />
                            </Tooltip> :
                            <Tooltip title='下麦'>
                                <img 
                                    src={get_img_url_by_name('apply-to-audience-icon')} 
                                    onClick={() => this.apply_audience()}
                                /> 
                            </Tooltip>

                        }
                        {
                            shared_desktop ? 
                            <Tooltip title='停止共享桌面'>
                                <img 
                                    src={get_img_url_by_name('stop-share-desktop-icon')} 
                                    onClick={() => this.stop_share_desktop()}
                                />
                            </Tooltip> :
                            <Tooltip title='共享桌面'>
                                <img 
                                    src={get_img_url_by_name('share-desktop-icon')} 
                                    onClick={() => this.share_desktop()}
                                /> 
                            </Tooltip>
                        }
                    </div>
                    {/* <img 
                        src={get_img_url_by_name('expand-icon')} 
                        onClick={this.expand_talker_list} 
                        style={{visibility:this.state.talker_list_show ? 'hidden' : 'visible'}}/> */}
                </div>
            </Footer>
        )
    }
}

class Room extends Component {
    constructor(props) {
        super(props);

        this.state = {

            // join start
            roomName:'',
            password:'',
            nickName:'',
            joined: false,
            loading: false,
            // join end

            user: {},
            user_room: {
                role: undefined
            },
            stream_list: [],
            own_stream: null,
            audio:true,
            video:true,

            talker_is_full:false, //主播已满
        };

    }

    // join fun start
    async join() {

        this.setState({ loading:true })
        let {
            roomName,
            password,
            nickName
        } = this.state;

        let { role } = this.state.user_room;
        let {
            username,
            token
        } = this.state.user;
        
        let params = {
            roomName,
            password,
            role,
            memName: 'easemob-demo#chatdemoui_' + username, // appkey + username 格式（后台必须）
            token,
            config:{ nickName }
        }

        try {
            const user_room = await emedia.mgr.joinRoom(params);
    
            let _this = this;
            this.setState({ 
                joined: true,
                user_room
            },() => {
                _this.publish();
            })
    
        } catch (error) { 
            if(error.error == -200){//主播人数已满
                this.setState({ talker_is_full: true })
            }
        }
    }
    join_handle(role){
        var _this = this;
        let { user_room } = this.state;
        user_room.role = role;
        this.props.form.validateFields((err, values) => {
            _this.setState({
                roomName: values.roomName,
                password: values.password,
                nickName: values.nickName,
                user_room
            },() => {
                if (!err) {
                    _this.join()
                }
            })
        });
    }
    // join fun end

    async componentDidMount () {

        const user = await login();
        this.setState({ user })
        this.init_emedia_callback();
        window.onbeforeunload=function(e){     
            var e = window.event||e;  
            emedia.mgr.exitConference();
        } 
    }

    init_emedia_callback() {
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

    publish() {
        let { role } = this.state.user_room
        if(role == 1){//观众不推流
            return
        }
        let { audio,video } = this.state //push 流取off(关) 的反值
        emedia.mgr.publish({ audio, video });
    }
    
    _on_stream_added(member, stream) {
        if(!member || !stream) {
            return
        }

        let { stream_list } = this.state

        if(stream.located()) {//自己 publish的流，添加role 属性
            this.setState({own_stream: stream});

            let { role } = this.state.user_room;
            member.role = role;
        }
        stream_list.push({ stream, member })

        this.setState({ stream_list })
    } 
    _on_stream_removed(stream) {
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
    
    render() {

        const { getFieldDecorator } = this.props.form;

        let { joined } = this.state;
        return (
            <div style={{width:'100%', height:'100%'}}>
                {/* join compoent */}
                <div className="login-wrap" style={{display: joined ? 'none' : 'flex'}}>
                    <div className="header">
                        <img src={get_img_url_by_name('logo-text-login')} />
                    </div>
                    <Form className="login-form">
                        <img src={get_img_url_by_name('logo')} />
                        <div style={{margin:'17px 0 45px'}}>欢迎使用环信多人会议</div>
                        <Item>
                            {getFieldDecorator('roomName', {
                                initialValue: 'room-8',
                                rules: [
                                    { required: true, message: '请输入房间名称' },
                                    { min:3 , message: '房间名称不能少于3位'}
                                ],
                            })(
                                <Input
                                prefix={<Icon type="home" style={{ color: 'rgba(0,0,0,.25)' }} />}
                                placeholder="房间名称"
                                />
                            )}
                        </Item>
                        <Item>
                        {getFieldDecorator('password', {
                            initialValue: '123',
                            rules: [
                                { required: true, message: '请输入房间密码' },
                                { min:3 , message: '密码长度不能小于3位'}
                            ],
                        })(
                            <Input
                            prefix={<Icon type="lock" style={{ color: 'rgba(0,0,0,.25)' }} />}
                            type="password"
                            placeholder="房间密码"
                            />
                        )}
                        </Item>
                        <Item>
                        {getFieldDecorator('nickName')(
                            <Input
                                prefix={<Icon type="user" style={{ color: 'rgba(0,0,0,.25)' }} />}
                                type="text"
                                placeholder="加入会议的昵称"
                            />
                        )}
                        </Item>

                        {/* <div>会议设置</div> */}
                        
                        <Row 
                            type="flex"
                            justify="space-between"
                            style={{margin: '-8px 0px 30px'}}>
                            <Checkbox
                                checked={this.state.video}
                                onChange={this.video_change}
                            >入会开启摄像头</Checkbox>
                        </Row>

                        <div className="action">
                            <Button 
                                type="primary"  
                                onClick={() => this.join_handle(3)}
                                loading={this.state.loading}
                            >
                                以主播身份进入
                            </Button>
                            <Button 
                                type="primary"  
                                onClick={() => this.join_handle(1)}
                                loading={this.state.loading}
                            >
                                以观众身份进入
                            </Button>
                        </div>

                        
                    </Form>
                
                    {/* 主播人数已满提醒框 */}
                    <Modal
                        visible={this.state.talker_is_full}
                        closable={false}
                        onOk={this.close_talker_model}
                        onCancel={this.close_talker_model}
                        okText="以观众身份登录"
                        cancelText="暂不登录"
                        centered={true}
                        mask={false}
                        maskClosable={false}
                        width='470px'

                    >
                        <div>
                            <img src={get_img_url_by_name('warning-icon')}/>
                        </div>
                        <div>主播人数已满<br></br>是否以观众身份进入？</div>
                    </Modal>
                </div>
                
                {/* room compoent */}
                {
                    joined ? 
                        <Layout className="meeting">
                            <RoomHeader {...this.state}/>
                            <TalkerList {...this.state}/>
                            <RoomFooter {...this.state}/>
                        </Layout>
                    : <i></i>
                }
            </div>
        )
    }
}
const WrapRoom = Form.create()(Room)
export default WrapRoom