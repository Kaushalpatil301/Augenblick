import axios from "axios";

const payapi = axios.create({
  baseURL: "https://api.fmm.finternetlab.io/v1/",
  headers: {
    "Content-Type": "application/json",
    "X-API-Key": "sk_hackathon_5d3da8cd5d11aa58990e3edd273b1dd6",
  },
});
export default payapi;
