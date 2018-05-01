(()=>{
    const updown_api_key = "ro-D2AkqvX75uCjdWj8b4Lz";
    const updown_headers = new Headers({"x-api-key": updown_api_key})

    const metrics_url_params = () => '?from=' +
        encodeURIComponent(
            (new Date(Date.now() - 4*60*1000))
            .toISOString().replace('T', ' ').replace('Z', '')
            .replace(/\.[0-9]+/, ''));

        // wow i hate this!!!

    const get_chitter_updown = () => fetch("https://updown.io/api/checks/1kae",
        { headers: updown_headers }).then(r => r.json());
    const get_chitter_updown_metrics = () => fetch(
        `https://updown.io/api/checks/1kae/metrics${metrics_url_params()}`,
        { headers: updown_headers }).then(r => r.json());
    const get_media_updown = () => fetch("https://updown.io/api/checks/ljag",
        { headers: updown_headers }).then(r => r.json());
    const get_media_updown_metrics = () => fetch(
        `https://updown.io/api/checks/ljag/metrics${metrics_url_params()}`,
        { headers: updown_headers }).then(r => r.json());

    const get_outages = () => fetch("https://s3-eu-west-1.amazonaws.com/chitter-outages/outages.json").then(r => r.json());

    const state = {
        outages: null,
        chitter_status: null,
        media_status: null
    }

    const collapse_to_status = ([state, metrics]) => {
        if(state.down) return 'down'
        else if(metrics.apdex < 0.9) return 'slow'
        else return 'ok'
    };

    const update_chitter = ()=>{
        return Promise.all([get_chitter_updown(), get_chitter_updown_metrics()])
            .then(collapse_to_status)
            .then(status => state['chitter_status'] = status);
    }

    const update_media = ()=>{
        return Promise.all([get_media_updown(), get_media_updown_metrics()])
            .then(collapse_to_status)
            .then(status => state['media_status'] = status);
    }

    const update_outages = ()=>{
        return get_outages().then(outages => state['outages'] = outages);
    }

    const wait = () => new Promise((resolve) => setTimeout(resolve, 30000 + Math.floor(Math.random()*5000)))

    const refresh_ui = ()=>{
        const overall = document.getElementById('overall');
        const chitter = document.getElementById('chitter');
        const media = document.getElementById('media');


        if(state.chitter_status == 'ok' && state.media_status == 'ok'){
            overall.dataset.status = 'ok';
            overall.querySelector('p').innerHTML = 'All clear';
        } else if(state.chitter_status == 'down' || state.media_status == 'down'){
            overall.dataset.status = 'error';
            overall.querySelector('p').innerHTML = 'Major disruption';
        } else if(state.chitter_status == 'slow' || state.media_status == 'slow'){
            overall.dataset.status = 'warning';
            overall.querySelector('p').innerHTML = 'Minor disruption';
        } else {
            overall.dataset.status = '';
            overall.querySelector('p').innerHTML = 'Status unknown';
        }

        for(const [el, status] of [[chitter, state.chitter_status], [media, state.media_status]]){
            if(status == 'ok'){
                el.dataset.status = 'ok';
                el.querySelector('p').innerHTML = 'OK';
            } else if(status == 'slow'){
                el.dataset.status = 'warning';
                el.querySelector('p').innerHTML = 'Slow';
            } else if(status == 'down'){
                el.dataset.status = 'error';
                el.querySelector('p').innerHTML = 'Down';
            } else {
                el.dataset.status = '';
                el.querySelector('p').innerHTML = 'Unknown';
            }
        }
    }

    const chitter_loop = () => update_chitter().then(refresh_ui).then(wait).then(chitter_loop);
    const media_loop = () => update_media().then(refresh_ui).then(wait).then(media_loop);

    chitter_loop();
    media_loop();

})();
