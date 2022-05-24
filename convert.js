const prompt = require("prompt");
const fs = require("fs-extra");
const util = require("util");
const exec = util.promisify(require("child_process").exec);
const JSZip = require("jszip");
const path = require("path");
const chalk = require("chalk");
const clear = require("clear");
const figlet = require("figlet");

createHeader();

prompt.start();

const promptProperties = [
  {
    name: "location",
    required: true,
  },
  {
    name: "resize",
    pattern: /^[0-9]*$/,
    message: "Resize must be number",
  },
  {
    name: "density",
    pattern: /^[0-9]*$/,
    message: "Density must be number",
  },
  {
    name: "quality",
    pattern: /^[0-9]*$/,
    message: "Quality must be number",
  },
];
async function start() {
  try {
    const promptResult = await prompt.get(promptProperties);
    const basePath = path.join(promptResult.location);
    await generateJpgFromEPSFiles(promptResult);
    const files = await fs.readdir(basePath);
    const epsFiles = files?.filter((itm) => itm?.split(".").pop() === "eps");

    if (epsFiles?.length > 0) {
      console.log(chalk.yellowBright(`${epsFiles.length} eps file will be zip with jpg variant, please wait...`));
      for (let index = 0; index < epsFiles.length; index++) {
        const epsFileName = epsFiles[index];
        const splittedEpsFileName = epsFileName.split(".");
        const fileExtension = splittedEpsFileName.pop();
        const jpgFileName = `${splittedEpsFileName.join(".")}.jpg`;
        if (files.indexOf(jpgFileName) >= 0) {
          const zipFileWithPath = path.join(basePath, `${splittedEpsFileName.join(".")}.zip`);
          const epsData = await fs.readFile(path.join(basePath, epsFileName));
          const jpgData = await fs.readFile(path.join(basePath, jpgFileName));
          console.log(chalk.blue(`Step ${index + 1} / ${epsFiles.length}`));
          await createZipFile({ epsFileName, jpgFileName, epsData, jpgData, zipFile: zipFileWithPath });
        } else {
          console.log(chalk.red(`Error: ${epsFileName} not converted to jpg`));
        }
      }
    } else {
      console.log(chalk.red("error: No EPS found"));
    }
  } catch (error) {
    console.log(chalk.red(`error: ${JSON.stringify(error, null, 2)}`));
  }
}
// ZIP EPS AND JPG FILES
function createZipFile({ epsFileName, epsData, jpgFileName, jpgData, zipFile }) {
  return new Promise((resolve, reject) => {
    try {
      const zip = new JSZip();
      zip.file(epsFileName, epsData);
      zip.file(jpgFileName, jpgData);
      zip
        .generateNodeStream({ type: "nodebuffer", compression: "DEFLATE" })
        .pipe(fs.createWriteStream(zipFile))
        .on("finish", function () {
          console.log(chalk.greenBright(`zip created: ${zipFile}`));
          resolve(true);
        })
        .on("error", (err) => {
          throw new Error(err);
        });
    } catch (error) {
      reject(error);
    }
  });
}
// CONVERT EPS TO JPG
async function generateJpgFromEPSFiles(result) {
  console.log(chalk.yellowBright("EPS files converting to JPG, please wait..."));
  const resize = Number(result.resize) > 0 ? `${result.resize}%` : "85%";
  const density = Number(result.density) > 0 ? result.density : 300;
  const quality = Number(result.quality) > 0 ? result.quality : 100;
  const command = `magick mogrify -path ${path.join(
    result?.location
  )} -density  ${density}  -quality ${quality} -units PixelsPerInch  -delete 1 -colorspace sRGB  -resize ${resize} -format jpg   ${path.join(
    result?.location,
    "*.eps"
  )}`;
  await exec(command);
  console.log(chalk.blue("EPS files converted!"));
}
// CLEAR AND CREATE HEADER FOR CONSOLE
function createHeader() {
  try {
    clear();
    console.log(chalk.cyan(figlet.textSync("EPS TO JPG", { horizontalLayout: "full" })));
    console.log(chalk.yellow(figlet.textSync("Convertor and Zipper", { horizontalLayout: "default" })));
  } catch (error) {
    console.log(chalk.red(`error: ${JSON.stringify(error, null, 2)}`));
  }
}
start();
