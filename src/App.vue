<script setup>
import { ref, reactive, watch, computed, onMounted } from "vue";
import { searchArtists, getTopTracks } from "@/services/spotify";
import Papa from "papaparse";

/* AUTHORISATION */
const authEndpoint = "https://accounts.spotify.com/authorize";
const clientId = "8afb0e1d03094c83b84eb81ba73cffea";
const redirectUri = "http://localhost:5173/";
const scopes = ["user-top-read"];
const token = ref(null);

/* LIST DATA */
const state = reactive({
    list: [],
});

const currentArtist = computed(() =>
    state.list.length ? state.list[page.value] : null,
);
const rate = computed({
    get() {
        return state.list.length ? state.list[page.value].rate : null;
    },
    set(newValue) {
        state.list[page.value].rate = newValue;
    },
});
const remark = computed({
    get() {
        return state.list.length ? state.list[page.value].remark : null;
    },
    set(newValue) {
        state.list[page.value].remark = newValue;
    },
});

const DownloadCSV = () => {
  let jsonToCSV = JSON.parse(JSON.stringify(state.list))
  jsonToCSV = jsonToCSV.map(row => {
    return {
    name: row.name,
      type: row.type,
      rate: row.rate,
      remark: row.remark
  }})
  const csv = Papa.unparse(jsonToCSV);
  const blob = new Blob([csv], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `ditisvet.csv`;
  a.click();
  URL.revokeObjectURL(url);
};

const handleFileChange = async (event) => {
    const file = event.target.files[0];
    Papa.parse(file, {
      delimiter: ';',
        header: true,
        skipEmptyLines: true,
        // dynamicTyping: true,
        complete: function (results) {
            state.list = results.data;
            console.log(state.list);
            page.value = 0;
        }.bind(this),
    });
};

/* SPOTIFY DATA */
const artists = ref(null);
const amountOfArtists = computed(() => artists.value?.length || 0);
const artist = ref(null);

const fetchArtists = async () => {
    artist.value = null;
    artists.value = await searchArtists(token.value, currentArtist.value.name);
    if (amountOfArtists.value === 1) {
        artist.value = artists.value[0];
        artist.value.tracks = await getTopTracks(token.value, artist.value.id);
    }
};

const selectArtist = async (id) => {
    artists.value = artists.value.filter((artist) => artist.id === id);
    artist.value = artists.value[0];
    artist.value.tracks = await getTopTracks(token.value, id);
};

/* NAVIGATION */
const page = ref(null);
const hasNext = computed(() => !(state.list.length > page.value + 1));
const hasPrevious = computed(() => !(0 < page.value));

const updatePage = async (direction) => {
  console.log('direction', direction)
  direction === "next" && page.value++
  direction === "previous" && page.value--
  if (audio.value) {
      stop();
  }
}

/* PLAYBACK */
const audio = ref(null);
const previewUrl = ref(null);

const play = (preview_url) => {
    if (previewUrl.value === preview_url) {
        return;
    }
    if (audio.value) {
        stop();
    }

    audio.value = new Audio(preview_url);

    audio.value.play().catch((error) => {
        console.error(error);
    });
    previewUrl.value = preview_url;
};

const stop = () => {
    audio.value.pause();
    audio.value = null;
};

/* LIFECYLCE */
onMounted(async () => {
    // Get the hash of the url
    const hash = window.location.hash
        .substring(1)
        .split("&")
        .reduce(function (initial, item) {
            if (item) {
                var parts = item.split("=");
                initial[parts[0]] = decodeURIComponent(parts[1]);
            }
            return initial;
        }, {});
    // window.location.hash = "";

    token.value = hash.access_token;

    if (!token.value) {
        window.location = `${authEndpoint}?client_id=${clientId}&redirect_uri=${redirectUri}&scope=${scopes.join("%20")}&response_type=token&show_dialog=true`;
    }
});

watch(page, async () => {
  await fetchArtists();
})
</script>

<template>
    <header>
        <h1>DITISVET-LIJST</h1>
        <button @click="DownloadCSV" class="download-btn">Download CSV</button>
    </header>
    <hr />
    <main v-if="state.list.length">
        <section class="artist-info" v-if="currentArtist">
            <div class="artist-info_header">
                <img v-if="artist?.images" :src="artist.images[2].url" />
                <div>
                    <h2>{{ currentArtist.name }} ({{ currentArtist.type }})</h2>
                    <p v-if="artist?.genres.length">
                        {{ artist.genres.join(", ") }}
                    </p>
                </div>
            </div>
            <p>{{ currentArtist.description }}</p>
            <div v-if="amountOfArtists === 1">
                <button
                    @click="window.open(artist.external_urls.spotify, '_blank')"
                >
                    Open in Spotify
                </button>
            </div>
        </section>
        <section>
            <div class="navigation">
                <button @click="updatePage('previous')" :disabled="hasPrevious">
                    Vorige
                </button>
                <button @click="updatePage('next')" :disabled="hasNext">Volgende</button>
            </div>
            <form>
                <p class="rating">
                    <input
                        type="radio"
                        name="rate"
                        id="rate"
                        value="vet"
                        v-model="rate"
                    />
                    <label for="vet">Vet</label> <br />

                    <input
                        type="radio"
                        name="rate"
                        id="rate"
                        value="misschien-vet"
                        v-model="rate"
                    />
                    <label for="misschien-vet">Misschien-vet</label><br />

                    <input
                        type="radio"
                        name="rate"
                        id="rate"
                        value="niet-vet"
                        v-model="rate"
                    />
                    <label for="niet-vet">Niet-vet</label><br />
                </p>
                <p>
                    <textarea v-model="remark" rows="7" cols="75"></textarea>
                </p>
            </form>
            <div v-if="amountOfArtists === 1" class="tracklist">
                <div v-for="track in artist?.tracks">
                    <div
                        :key="track.id"
                        @mouseover="play(track.preview_url)"
                        class="track"
                    >
                        <img :src="track.album.images[2].url" />
                        {{ track.name }}
                    </div>
                </div>
                <button @click="stop()">Stop audio</button>
            </div>
          <div v-else-if="amountOfArtists > 1">
            <p>
              Multiple artists found with this name, select an artist to
              get the right music
            </p>
            <div v-if="artists" class="artists">
              <div v-for="artist in artists" class="artists_option">
                <div @click="selectArtist(artist.id)" :key="artist.id">
                  <img
                      v-if="artist?.images.length"
                      :src="artist.images[2].url"
                  />
                  <div>(No image)</div>
                  {{ artist.name }}
                  <template v-if="artist.genres.length">
                    {{ artist.genres.join(", ") }}
                  </template>

                  <a
                      :href="artist.external_urls.spotify"
                      target="_blank"
                  >
                    Open in Spotify
                  </a>
                </div>
              </div>
            </div>
          </div>
            <div v-else><p>No music found for this artist</p></div>
        </section>
    </main>
    <main v-else>
        <input type="file" accept=".csv" @change="handleFileChange" />
    </main>
</template>

<style scoped></style>
