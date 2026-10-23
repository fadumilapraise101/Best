// State Management
let playlist = [];
let communityTracks = [
    {
        id: 'c1',
        title: 'Acoustic Breeze',
        artist: 'Benjamin Tissot',
        album: 'Bensound Royalty Free',
        url: 'https://www.bensound.com/bensound-music/bensound-acousticbreeze.mp3',
        cover: null
    },
    {
        id: 'c2',
        title: 'Creative Minds',
        artist: 'Benjamin Tissot',
        album: 'Bensound Royalty Free',
        url: 'https://www.bensound.com/bensound-music/bensound-creativeminds.mp3',
        cover: null
    },
    {
        id: 'c3',
        title: 'Ukulele',
        artist: 'Benjamin Tissot',
        album: 'Bensound Royalty Free',
        url: 'https://www.bensound.com/bensound-music/bensound-ukulele.mp3',
        cover: null
    }
];

let currentIndex = -1;
let isPlaying = false;
let isShuffle = false;
let repeatMode = 0; // 0: Off, 1: Playlist, 2: Track

// DOM Elements
const audio = document.getElementById('audio-player');
const playBtn = document.getElementById('btn-play');
const prevBtn = document.getElementById('btn-prev');
const nextBtn = document.getElementById('btn-next');
const shuffleBtn = document.getElementById('btn-shuffle');
const repeatBtn = document.getElementById('btn-repeat');
const seekBar = document.getElementById('seek-bar');
const volumeBar = document.getElementById('volume-bar');
const currentTimeEl = document.getElementById('current-time');
const totalDurationEl = document.getElementById('total-duration');
const currentTitle = document.getElementById('current-title');
const currentArtist = document.getElementById('current-artist');
const currentCover = document.getElementById('current-cover');
const downloadBtn = document.getElementById('btn-download');
const libraryList = document.getElementById('library-list');
const communityList = document.getElementById('community-list');
const audioUpload = document.getElementById('audio-upload');
const searchInput = document.getElementById('search-input');
const canvas = document.getElementById('visualizer');
const canvasCtx = canvas.getContext('2d');

// Audio Context & Visualizer Setup
let audioCtx, analyser, sourceNode;

function initAudioContext() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        analyser = audioCtx.createAnalyser();
        sourceNode = audioCtx.createMediaElementSource(audio);
        sourceNode.connect(analyser);
        analyser.connect(audioCtx.destination);
        analyser.fftSize = 64;
        drawVisualizer();
    }
}

// Navigation Tabs
document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.view-section').forEach(s => s.classList.remove('active'));
        
        btn.classList.add('active');
        const tab = btn.dataset.tab;
        document.getElementById(`${tab}-view`).classList.add('active');
        document.getElementById('tab-title').innerText = tab === 'library' ? 'My Library' : 'Community Tracks';
    });
});

// Load Local Audio Files with ID3 Metadata
audioUpload.addEventListener('change', (e) => {
    const files = Array.from(e.target.files);
    
    files.forEach(file => {
        const fileUrl = URL.createObjectURL(file);
        
        // Parse ID3 Tags
        window.jsmediatags.read(file, {
            onSuccess: function(tag) {
                const tags = tag.tags;
                let coverUrl = null;
                
                if (tags.picture) {
                    const { data, format } = tags.picture;
                    let base64String = "";
                    for (let i = 0; i < data.length; i++) {
                        base64String += String.fromCharCode(data[i]);
                    }
                    coverUrl = `data:${format};base64,${btoa(base64String)}`;
                }

                addTrackToLibrary({
                    id: Date.now() + Math.random(),
                    title: tags.title || file.name.replace(/\.[^/.]+$/, ""),
                    artist: tags.artist || 'Unknown Artist',
                    album: tags.album || 'Unknown Album',
                    url: fileUrl,
                    cover: coverUrl
                });
            },
            onError: function() {
                addTrackToLibrary({
                    id: Date.now() + Math.random(),
                    title: file.name.replace(/\.[^/.]+$/, ""),
                    artist: 'Unknown Artist',
                    album: 'Unknown Album',
                    url: fileUrl,
                    cover: null
                });
            }
        });
    });
});

function addTrackToLibrary(track) {
    playlist.push(track);
    renderLibrary();
    if (currentIndex === -1) {
        loadTrack(0);
    }
}

// Render Lists
function renderLibrary() {
    libraryList.innerHTML = '';
    playlist.forEach((track, index) => {
        libraryList.appendChild(createTrackRow(track, index, true));
    });
}

function renderCommunity() {
    communityList.innerHTML = '';
    communityTracks.forEach((track, index) => {
        communityList.appendChild(createTrackRow(track, index, false));
    });
}

function createTrackRow(track, index, isLocal) {
    const div = document.createElement('div');
    div.className = 'track-item';
    
    const coverHtml = track.cover 
        ? `<img src="${track.cover}" class="track-item-img">`
        : `<div class="track-item-img"><i class="fa-solid fa-music"></i></div>`;

    div.innerHTML = `
        ${coverHtml}
        <div><strong>${track.title}</strong></div>
        <div style="color: #a0a5c0;">${track.artist}</div>
        <div style="color: #a0a5c0;">${track.album}</div>
        <div class="track-item-actions">
            <button class="action-btn play-item-btn"><i class="fa-solid fa-play"></i></button>
            ${!isLocal ? `<button class="action-btn add-item-btn" title="Add to Library"><i class="fa-solid fa-plus"></i></button>` : ''}
            <a href="${track.url}" download="${track.title}.mp3" class="action-btn"><i class="fa-solid fa-download"></i></a>
        </div>
    `;

    div.querySelector('.play-item-btn').addEventListener('click', () => {
        if (!isLocal) {
            playlist.push(track);
            renderLibrary();
            loadTrack(playlist.length - 1);
        } else {
            loadTrack(index);
        }
        playTrack();
    });

    if (!isLocal) {
        div.querySelector('.add-item-btn')?.addEventListener('click', (e) => {
            e.stopPropagation();
            playlist.push(track);
            renderLibrary();
            alert(`Added "${track.title}" to your library!`);
        });
    }

    return div;
}

// Player Functions
function loadTrack(index) {
    if (index < 0 || index >= playlist.length) return;
    
    currentIndex = index;
    const track = playlist[currentIndex];
    
    audio.src = track.url;
    currentTitle.innerText = track.title;
    currentArtist.innerText = track.artist;
    downloadBtn.href = track.url;
    downloadBtn.download = `${track.title}.mp3`;

    if (track.cover) {
        currentCover.innerHTML = `<img src="${track.cover}">`;
    } else {
        currentCover.innerHTML = `<i class="fa-solid fa-music"></i>`;
    }
}

function playTrack() {
    initAudioContext();
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
    audio.play();
    isPlaying = true;
    playBtn.innerHTML = `<i class="fa-solid fa-pause"></i>`;
}

function pauseTrack() {
    audio.pause();
    isPlaying = false;
    playBtn.innerHTML = `<i class="fa-solid fa-play"></i>`;
}

playBtn.addEventListener('click', () => {
    if (playlist.length === 0) return;
    if (isPlaying) {
        pauseTrack();
    } else {
        playTrack();
    }
});

nextBtn.addEventListener('click', handleNext);
prevBtn.addEventListener('click', () => {
    if (isShuffle) {
        loadTrack(Math.floor(Math.random() * playlist.length));
    } else {
        loadTrack(currentIndex > 0 ? currentIndex - 1 : playlist.length - 1);
    }
    playTrack();
});

function handleNext() {
    if (playlist.length === 0) return;

    if (repeatMode === 2) {
        loadTrack(currentIndex);
    } else if (isShuffle) {
        loadTrack(Math.floor(Math.random() * playlist.length));
    } else {
        if (currentIndex < playlist.length - 1) {
            loadTrack(currentIndex + 1);
        } else if (repeatMode === 1) {
            loadTrack(0);
        } else {
            pauseTrack();
            return;
        }
    }
    playTrack();
}

audio.addEventListener('ended', handleNext);

// Time & Seek Updates
audio.addEventListener('timeupdate', () => {
    if (isNaN(audio.duration)) return;
    
    const progress = (audio.currentTime / audio.duration) * 100;
    seekBar.value = progress;
    
    currentTimeEl.innerText = formatTime(audio.currentTime);
    totalDurationEl.innerText = formatTime(audio.duration);
});

seekBar.addEventListener('input', () => {
    const time = (seekBar.value / 100) * audio.duration;
    audio.currentTime = time;
});

volumeBar.addEventListener('input', (e) => {
    audio.volume = e.target.value;
});

shuffleBtn.addEventListener('click', () => {
    isShuffle = !isShuffle;
    shuffleBtn.classList.toggle('active', isShuffle);
});

repeatBtn.addEventListener('click', () => {
    repeatMode = (repeatMode + 1) % 3;
    if (repeatMode === 0) {
        repeatBtn.classList.remove('active');
        repeatBtn.innerHTML = `<i class="fa-solid fa-repeat"></i>`;
    } else if (repeatMode === 1) {
        repeatBtn.classList.add('active');
        repeatBtn.innerHTML = `<i class="fa-solid fa-repeat"></i>`;
    } else {
        repeatBtn.classList.add('active');
        repeatBtn.innerHTML = `<i class="fa-solid fa-repeat" style="color: #a29bfe;"></i> 1`;
    }
});

function formatTime(seconds) {
    const min = Math.floor(seconds / 60);
    const sec = Math.floor(seconds % 60);
    return `${min}:${sec < 10 ? '0' : ''}${sec}`;
}

// Search Filter
searchInput.addEventListener('input', (e) => {
    const query = e.target.value.toLowerCase();
    
    document.querySelectorAll('#library-list .track-item').forEach((item, idx) => {
        const track = playlist[idx];
        const match = track.title.toLowerCase().includes(query) || track.artist.toLowerCase().includes(query);
        item.style.display = match ? 'grid' : 'none';
    });
});

// Canvas Frequency Visualizer
function drawVisualizer() {
    requestAnimationFrame(drawVisualizer);
    
    if (!analyser) return;

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    analyser.getByteFrequencyData(dataArray);

    canvas.width = canvas.parentElement.clientWidth;
    canvas.height = 4;

    canvasCtx.clearRect(0, 0, canvas.width, canvas.height);

    const barWidth = (canvas.width / bufferLength) * 2.5;
    let x = 0;

    for (let i = 0; i < bufferLength; i++) {
        const barHeight = (dataArray[i] / 255) * canvas.height;

        canvasCtx.fillStyle = '#6c5ce7';
        canvasCtx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);

        x += barWidth + 1;
    }
}

// Initial Setup
renderCommunity();
