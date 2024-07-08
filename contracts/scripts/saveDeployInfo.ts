import fs from "fs";

const DEPLOYMENT_FILE = "./scripts/deployment.json";

export default async function saveDeployInfo(moduleName: string, address: string) {
    let data: any = {};
    if (fs.existsSync(DEPLOYMENT_FILE)) {
        const rawData = fs.readFileSync(DEPLOYMENT_FILE).toString();

        if (data != "") {
            data = JSON.parse(rawData);
        }
    }

    data[moduleName] = address;
    fs.writeFileSync(DEPLOYMENT_FILE, JSON.stringify(data, null, '\t'));
}