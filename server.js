/**
 * This is the main Node.js server script for your project
 * Check out the two endpoints this back-end API provides in fastify.get and fastify.post below
 */

const express = require("express");
const app = express();
const { GoogleSpreadsheet } = require("google-spreadsheet");



async function authForSheet(sheetID) {
  const doc = new GoogleSpreadsheet(
    process.env.SPREADSHEET
  );
  await doc.useServiceAccountAuth({
    client_email: process.env.CLIENT_EMAIL,
    private_key: process.env.PRIVATE_KEY,
  });
  await doc.loadInfo();
  return doc;
}

const cors = require("cors"); // importing the `cors` package
app.use(cors()); // tells Express to use `cors`, and solves the issue
app.use(express.json())
app.listen(3000); // tells Express which port to listen on

app.get("/", (req, res) => {
  res.send("hello world");
});

app.post("/lookup", async (req, res) => {
  // email --> reservation identifier
  // reservation identifier to reservation
  res.send;
});

app.post("/", async (req, res) => {
  try {
    const doc = await authForSheet();
    const page = doc.sheetsByIndex[0]; // or use doc.sheetsById[id] or doc.sheetsByTitle[title]
    console.log(page.title);
    console.log(page.rowCount);
    res.send("Success");
  } catch (err) {
    console.log(err);
    res.send("Error!");
  }
});

async function lookup(email, doc) {
  const lookupSheet = doc.sheetsByTitle["lookup"];
  const rows = await lookupSheet.getRows();
  for (const row of rows) {
    console.log(row.Email);
    if (email == row.Email) {
      console.log(row.Rows);
      return row.Rows.replace(/\s+/g, "").split(",");
    }
  }
  const lookupError = doc.sheetsByTitle["lookup-errors"]
  await lookupError.addRow({Date: new Date().toLocaleString("en-US", {timeZone: "America/Los_Angeles"}), Email: email})
  return [];
}

app.get("/lookup/:email", async (req, res) => {
  try {
    const doc = await authForSheet();
    const rowIDs = await lookup(req.params.email, doc);
    if (rowIDs.length === 0) {
      return res.send({error: "Lookup failed"});
    }
    const lookupLog = doc.sheetsByTitle["lookup-log"]
    await lookupLog.addRow({Date: new Date().toLocaleString("en-US", {timeZone: "America/Los_Angeles"}), Email: email})
    const rsvpSheet = doc.sheetsByTitle["rsvp"];
    const allAttendees = await rsvpSheet.getRows();
    let ret = {
      "rowIDs": rowIDs,
      "attendees": {}
    };
    for (const ID of rowIDs) {
      const attendeeIdx = ID - 2;
      const attendeeRow = allAttendees[attendeeIdx];
      console.log(attendeeRow);
      ret["rehearsalDinner?"] = attendeeRow.Rehearsal !== "n/a";
      console.log(ret);
      ret["attendees"][attendeeRow.Name] = {
        rehearsal: attendeeRow.Rehearsal,
        wedding: attendeeRow.Wedding,
        weddingTransportation: attendeeRow.WeddingTransportation,
        ranch: attendeeRow.Ranch,
        ranchTransportation: attendeeRow.RanchTransportation,
        dietary: attendeeRow.Dietary,
      };
    }
    res.send(ret);
  } catch (err) {
    console.log(err);
    res.send("Error!");
  }
});

app.get("/fetch-rsvp", async (req, res) => {
  try {
    const doc = await authForSheet();
    const sheet = doc.sheetsByTitle["rsvp"];
    const rows = await sheet.getRows();
    console.log(rows);
    let data = {};
    for (const row in rows) {
    }
    res.send(rows);
  } catch (err) {
    console.log(err);
    res.send("Error!");
  }
});

app.post("/rsvp", async (req, res) => {
  console.log("/rsvp")
  console.log(req.body)
  try {
    const doc = await authForSheet();
    const sheet = doc.sheetsByTitle["rsvp-log"];
    await sheet.addRows(req.body.formData)
    const rsvpSheet = doc.sheetsByTitle['rsvp']
    await addToRSVPRecord(req.body.formData, rsvpSheet)
    res.send("Success!")
  } catch (err) {
    console.log(err);
    res.send("Error!");
  }
});

function formatFormData(rowIDs, formData) {
  const timestamp = formData[0]["value"]
  const weddingTrans= formData[2]["value"]
  const ranchTrans=formData[3]["value"]
  let byAttendee = {}
  const iter = rowIDs.length;
  console.log(iter)
  for (var i = 0; i < iter; i++){
    const start = 4 + i
    byAttendee[rowIDs[i]] = {
      'Updated':timestamp,
      'Name': formData[start]["value"],
      'Rehearsal': formData[start + iter]["value"],
      'Wedding': formData[start + iter*2]["value"],
      'Ranch': formData[start + iter*3]["value"],
      'Dietary': formData[start + iter*4]["value"],
      'WeddingTransportation': weddingTrans,
      'RanchTransportation': ranchTrans,
    }           
  }
  return byAttendee
}

async function addToRSVPRecord(formData, sheet){
  const rowIDs = formData[1]["value"].replace(/\s+/g, "").split(",")
  console.log(rowIDs)
  const formatted = formatFormData(rowIDs, formData)
  console.log(formatted)
  for (const rowID of rowIDs) {
    const rows = await sheet.getRows({offset: parseInt(rowID)-2, limit: 1})
    const row = rows[0]
    row.Updated = formatted[rowID]["Updated"]
    row.Rehearsal = formatted[rowID]["Rehearsal"]
    row.Wedding = formatted[rowID]["Wedding"]
    row.Ranch = formatted[rowID]["Ranch"]
    row.Dietary = formatted[rowID]["Dietary"]
    row.WeddingTransportation = formatted[rowID]["WeddingTransportation"]
    row.RanchTransportation = formatted[rowID]["RanchTransportation"]
    await row.save()
  }
  
}
