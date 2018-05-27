(()=>{
    const updown_api_key = "ro-D2AkqvX75uCjdWj8b4Lz";
    const updown_headers = new Headers({"x-api-key": updown_api_key})

    const quantize = (value, stepsize) => value - (value % stepsize);

    const metrics_url_params = () => '?from=' +
        encodeURIComponent(
            // the quantization is to allow more efficient caching
            (new Date(quantize(Date.now()
                + 1000*60*60*2 // updown expects times in UTC+2???
                , 60*60*1000)))
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

    const ensure_ok = (response) => {
        if(!response.ok){
            return Promise.reject(response);
        }
        return response;
    };

    const get_updates = () => fetch("https://s3-eu-west-1.amazonaws.com/chitter-outages/updates.html").then(ensure_ok).then(r => r.text());

    const state = {
        updates: '',
        chitter_status: null,
        media_status: null
    }

    const collapse_to_status = ([state, metrics]) => {
        if(state.down) return 'down'
        else if(metrics.apdex < 0.8) return 'slow'
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

    const update_updates /* heh */ = ()=>{
        return get_updates().then(updates => state['updates'] = updates);
    }

    const wait = () => new Promise((resolve) => setTimeout(resolve, 10000 + Math.floor(Math.random()*5000)))

    const refresh_ui = ()=>{
        const overall = document.getElementById('overall');
        const chitter = document.getElementById('chitter');
        const media = document.getElementById('media');

        const updates = document.querySelector('#overall .updates');


        if(state.chitter_status == 'ok' && state.media_status == 'ok'){
            overall.dataset.status = 'ok';
            overall.querySelector('p.status').innerHTML = 'No issues';
            overall.querySelector('p.subtitle').innerHTML = 'Clear skies ahead.';
        } else if(state.chitter_status == 'down' || state.media_status == 'down'){
            overall.dataset.status = 'error';
            overall.querySelector('p.status').innerHTML = 'Major disruption';
            overall.querySelector('p.subtitle').innerHTML = 'Stay tuned for updates. This page refreshes automatically.';
        } else if(state.chitter_status == 'slow' || state.media_status == 'slow'){
            overall.dataset.status = 'warning';
            overall.querySelector('p.status').innerHTML = 'Minor disruption';
            overall.querySelector('p.subtitle').innerHTML = 'Stay tuned for updates. This page refreshes automatically.';
        } else {
            overall.dataset.status = '';
            overall.querySelector('p.status').innerHTML = '...';
            overall.querySelector('p.subtitle').innerHTML = '...';
        }

        for(const [el, status] of [[chitter, state.chitter_status], [media, state.media_status]]){
            if(status == 'ok'){
                el.dataset.status = 'ok';
                el.querySelector('p.status').innerHTML = 'OK';
            } else if(status == 'slow'){
                el.dataset.status = 'warning';
                el.querySelector('p.status').innerHTML = 'Slow';
            } else if(status == 'down'){
                el.dataset.status = 'error';
                el.querySelector('p.status').innerHTML = 'Down';
            } else {
                el.dataset.status = '';
                el.querySelector('p.status').innerHTML = '...';
            }
        }

        if(updates.innerHTML != state.updates){
            updates.innerHTML = state.updates;
        }
    }

    const chitter_loop = () => update_chitter().then(refresh_ui).then(wait).then(chitter_loop).catch(() => wait().then(chitter_loop));
    const media_loop = () => update_media().then(refresh_ui).then(wait).then(media_loop).catch(() => wait().then(media_loop));
    const updates_loop = () => update_updates().then(refresh_ui).then(wait).then(updates_loop).catch(() => wait().then(updates_loop));

    chitter_loop();
    media_loop();
    updates_loop();

})();
