

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

    // this.init()
}

export default Emedia;