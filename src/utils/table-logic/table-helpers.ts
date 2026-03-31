import { isArray } from "lodash";

export function arraysToObject(keys: string | any[], values: string | any[]) {
  if (keys.length !== values.length) {
    return;
  }

  const newArr = [];
  for (let i = 0; i < keys.length; i++) {
    const value = keys[i];
    const label = values[i];

    const obj = { label, value };
    newArr.push(obj);
  }

  return newArr;
}

export function toTitleCase(str: string) {
  return str
    .toLowerCase()
    .split(" ")
    .map(function (word: string) {
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(" ");
}

export const convertTime = (data: string, type?: string) => {
  let dateTimeParts: string[],
    dateParts: string[],
    day: number,
    month: number,
    year: number,
    timeParts: string[],
    hour: number,
    minute: number,
    second: number,
    date;

  switch (type) {
    case "SEEK-START":
      dateTimeParts = data.split("/");
      day = parseInt(dateTimeParts[0], 10);
      month = parseInt(dateTimeParts[1], 10) - 1;
      year = parseInt(dateTimeParts[2], 10);

      date = new Date(year, month, day);
      return date;

    case "SEEK-END":
      dateTimeParts = data.split("-");
      day = parseInt(dateTimeParts[0], 10);
      month = parseInt(dateTimeParts[1], 10) - 1;
      year = parseInt(dateTimeParts[2], 10);

      date = new Date(year, month, day);
      return date;

    default:
      if (data) {
        dateTimeParts = data.split(" ");

        dateParts = dateTimeParts[0].split("-");
        day = parseInt(dateParts[0], 10);
        month = parseInt(dateParts[1], 10) - 1;
        year = parseInt(dateParts[2], 10);

        if (dateTimeParts[1]) {
          timeParts = dateTimeParts[1].split(":");
          hour = parseInt(timeParts[0], 10);
          minute = parseInt(timeParts[1], 10);
          second = parseInt(timeParts[2], 10);
        } else {
          hour = parseInt("0", 10);
          minute = parseInt("0", 10);
          second = parseInt("0", 10);
        }

        date = new Date(year, month, day, hour, minute, second);
        return date;
      } else {
        return null;
      }
  }
};

export const updateTime = (value: string | number | Date) => {
  let date;
  date = new Date(value);
  date = new Date(
    date.toLocaleString("en-US", { timeZone: "Australia/Sydney" })
  );
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const day = date.getDate().toString().padStart(2, "0");
  const hour = date.getHours().toString().padStart(2, "0");
  const minute = date.getMinutes().toString().padStart(2, "0");
  const second = date.getSeconds().toString().padStart(2, "0");
  return `${day}-${month}-${year} ${hour}:${minute}:${second}`;
};

export const createTime = (value: string | number | Date) => {
  const dateTime = new Date(value);
  const day = dateTime.getDate();
  const month = dateTime.getMonth() + 1; // January is 0, so add 1
  const year = dateTime.getFullYear();
  const hour = dateTime.getHours();
  const minute = dateTime.getMinutes();
  const second = dateTime.getSeconds();

  const paddedDay = day < 10 ? "0" + day : day;
  const paddedMonth = month < 10 ? "0" + month : month;
  const paddedHour = hour < 10 ? "0" + hour : hour;
  const paddedMinute = minute < 10 ? "0" + minute : minute;
  const paddedSecond = second < 10 ? "0" + second : second;

  return `${paddedDay}-${paddedMonth}-${year} ${paddedHour}:${paddedMinute}:${paddedSecond}`;
};

export const modifyupdateData = (el: any) => {
  const keys = Object.keys(el);
  for (let i = 0; i < Object.keys(el).length; i++) {
    if (isArray(el[keys[i]])) {
      el[keys[i]] = el[keys[i]].join(",");
    }
  }

  return { ...el };
};

export function handleAccountApproval(
  user: { role: string; isDocumentUploaded: any; _id: any; firstName: any },
  setActionUser: (arg0: any) => void,
  setIsAccountApprovalModalOpen: (arg0: (prev: any) => boolean) => void,
  approveMutation: {
    trigger: (arg0: { isDocumentApproved: boolean; uid: any }) => Promise<any>;
  },
  mutate: () => any
) {
  if (["sales", "coach", "partner", "customer"].includes(user.role)) {
    setActionUser(user);
    setIsAccountApprovalModalOpen((prev: any) => !prev);
  } else {
    if (user.isDocumentUploaded) {
      approveMutation
        .trigger({
          isDocumentApproved: true,
          uid: user._id,
        })
        .then(() => mutate?.());
    } else {
      // toast imported locally or pass toast
    }
  }
}
