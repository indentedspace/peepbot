const log = (data: any, ...extraData: any[]) => {
  console.log(new Date().toISOString(), "-", data, ...extraData);
};

export default log;
