const path = require("path");
const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const axios = require('axios').default;
const { init: initDB, Counter } = require("./db");
const appid = "wx158c5308346ab904";
const secret = "f76c37f09bd115b849f4838af1195b1c";

const logger = morgan("tiny");

const app = express();
const scheduleData = require("./hackmini.json");
const formatedScheduleData = scheduleData.map(row => {
    return {
        ...row,
        etd: row["etd"] ? new Date(row["etd"]) : null
    }
});
const scheduleV2Data = require("./hackmini_v2.json");
const formatedScheduleV2Data = scheduleV2Data.map(row => {
    return {
        ...row,
        proforma_etd: row["proforma_etd"] ? new Date(row["proforma_etd"]) : null,
        live_etd: row["live_etd"] ? new Date(row["live_etd"]) : null,
        eta: row["eta"] ? new Date(row["eta"]) : null,
    }
});

app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use(cors());
app.use(logger);

// 首页
app.get("/", async (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

// 更新计数
app.post("/api/count", async (req, res) => {
  const { action } = req.body;
  if (action === "inc") {
    await Counter.create();
  } else if (action === "clear") {
    await Counter.destroy({
      truncate: true,
    });
  }
  res.send({
    code: 0,
    data: await Counter.count(),
  });
});

app.get("/api/schedule_data", async (req, res) => {
    res.send({
        code: 0,
        data: "hello world"
    })
})

app.get("/api/test", async (req, res) => {
    res.send({
        code: 0,
        data: `${JSON.stringify(req.body)}`
    })
})

app.post("/api/message", async (req, res) => {
    const response = await axios.get(`https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${appid}&secret=${secret}`);
    const accessToken = response.data.access_token;
    if(!accessToken) {
        res.send({
            code: 0,
            data: "Get accessToken failed",
        });
        return;
    }
    // https://api.weixin.qq.com/sns/jscode2session?appid=APPID&secret=SECRET&js_code=JSCODE&grant_type=authorization_code
    /* const jsCode = "053sYs000ujKON11l14009c71k4sYs0s";
     * const codeResponse = await axios.get(`https://api.weixin.qq.com/sns/jscode2session?appid=${appid}&secret=${secret}&js_code=${jsCode}&grant_type=authorization_code`);
     * const openId = codeResponse.data.openid; */
    const openId = "ochDw5RpO8L-7yHvaEDIXptWBzWY";
    const messageResponse = await axios.post(`https://api.weixin.qq.com/cgi-bin/message/subscribe/send?access_token=${accessToken}`, {
        "touser": openId,
        "template_id": "-t9BsBkcs25h_j0jhqjtk7jNbjcjwWj5QhdHXjWX3Jw",
        "data": {
            "thing1": {
                "value": "Ruby",
            },
            "thing2": {
                "value": "空班船名变更，船期延迟",
            },
        },
    });
    res.send({
        code: 0,
        data: messageResponse,
    });
})

app.get("/api/schedule", async (req, res) => {
    const { pol, pod, etd_start, etd_end } = req.query;
    if(!pol || !pod || !etd_start || !etd_end) {
        res.send({
            code: 1,
            data: `One of pol, pod, etd_start, etd_end is missing. ${pol} ${pod} ${etd_start} ${etd_end}`
        })
    }
    const etd_start_date = new Date(etd_start)
    const etd_end_date = new Date(etd_end)
    const result = formatedScheduleData.filter((row) => row.ports_of_loading == pol && (row.ports_of_discharge || []).includes(pod) && row.etd <= etd_end_date && row.etd >= etd_start_date)
    res.send({
        code: 0,
        data: result
    })
})

app.get("/api/schedule_v2", async (req, res) => {
    const { pol, pod, etd_start, etd_end } = req.query;
    if(!pol || !pod || !etd_start || !etd_end) {
        res.send({
            code: 1,
            data: `One of pol, pod, etd_start, etd_end is missing. ${pol} ${pod} ${etd_start} ${etd_end}`
        })
    }
    const etd_start_date = new Date(etd_start);
    const etd_end_date = new Date(etd_end);
    const result = formatedScheduleV2Data.filter((row) =>
        (row.pol || "").toLowerCase() == decodeURIComponent(pol).toLowerCase() &&
                                                        (row.pod || "").toLowerCase() == decodeURIComponent(pod).toLowerCase() &&
                                                        row.proforma_etd <= etd_end_date &&
                                                        row.proforma_etd >= etd_start_date);
    res.send({
        code: 0,
        data: result
    });
})

// 获取计数
app.get("/api/count", async (req, res) => {
    const result = await Counter.count();
  res.send({
    code: 0,
    data: result,
  });
});

// 小程序调用，获取微信 Open ID
app.get("/api/wx_openid", async (req, res) => {
  if (req.headers["x-wx-source"]) {
    res.send(req.headers["x-wx-openid"]);
  }
});

const port = process.env.PORT || 80;

async function bootstrap() {
  await initDB();
  app.listen(port, () => {
    console.log("启动成功", port);
  });
}

bootstrap();
