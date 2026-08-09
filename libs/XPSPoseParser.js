function fillArray(array, minLen, value) {
  // Complete the array with selected value
  const extraLen = Math.max(0, minLen - array.length);
  return array.concat(Array.from({ length: extraLen }, () => value));
}


function poseData(poseList) {
  let poseData = {};
  try {
    for (let bonePose of poseList) {
      if (bonePose && bonePose.includes(":")) {
        const pose = bonePose.split(':');
        if (pose.length < 2) continue;
        const boneName = pose[0].trim();
        if (!boneName) continue;
        const dataList = fillArray(pose[1].trim().split(/\s+/), 9, 1);
        try {
          const rotation = {
            x: parseFloat(dataList[0]),
            y: parseFloat(dataList[1]),
            z: parseFloat(dataList[2])
          };
          const position = {
            x: parseFloat(dataList[3]),
            y: parseFloat(dataList[4]),
            z: parseFloat(dataList[5])
          };
          const scale = {
            x: parseFloat(dataList[6]),
            y: parseFloat(dataList[7]),
            z: parseFloat(dataList[8])
          };

          let bonePose = {
            name: boneName,
            position,
            rotation,
            scale
          };
          poseData[boneName] = bonePose;
        } catch (error) {
          console.warn(`Error parsing pose data for bone ${boneName}`, error);
          continue;
        }
      }
    }
  } catch (error) {
    console.warn("Error processing pose data", error);
  }
  return poseData;
}

export { poseData };