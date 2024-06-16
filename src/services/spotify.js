import axios from "axios";

const spotify_url = "https://api.spotify.com/v1/";

export const searchArtists = async (token, artistName) => {
  try {
    const response = await axios.get(
      `${spotify_url}search?q=${artistName}&type=artist`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    );
    return response.data?.artists?.total > 0
      ? response?.data.artists.items.filter(
          (artist) => artist.name.toLowerCase() === artistName.toLowerCase(),
        )
      : null;
  } catch (error) {
    console.log(error);
  }
};

export const getTopTracks = async (token, artistId) => {
  try {
    const response = await axios.get(
      `${spotify_url}artists/${artistId}/top-tracks`,
      {
        headers: { Authorization: `Bearer ${token}` },
      },
    );
    return response.data?.tracks.slice(0, 5);
  } catch (error) {
    console.log(error);
  }
};
