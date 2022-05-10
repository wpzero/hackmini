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
const scheduleData = require("./hackmini.json")
const formatedScheduleData = scheduleData.map(row => {
    return {
        ...row,
        etd: row["etd"] ? new Date(row["etd"]) : null
    }
})

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
        return
    }
    const messageResponse = await axios.post(`https://api.weixin.qq.com/cgi-bin/message/subscribe/send?access_token=${accessToken}`, {
        "touser": "053CM1ll2U3j994XTNol2tBUKc3CM1lf",
        "template_id": "o5AbXgWrC0rDgmTwXPrjBkp5-T2h8BytjBbH4-IunzE",
        "data": {
            "name1": "2022",
            "thing4": "hackmini",
        },
    })
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
