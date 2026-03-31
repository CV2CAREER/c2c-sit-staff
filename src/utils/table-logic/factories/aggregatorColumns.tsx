/* eslint-disable @typescript-eslint/ban-ts-comment */
import moment from "moment";
import {
  ReactElement,
  JSXElementConstructor,
  ReactNode,
  ReactPortal,
  AwaitedReactNode,
} from "react";

export const applyAggregatorColumn = (el: any) => {
  switch (el.field) {
    case "jobsite":
      return {
        ...el,
        renderCell: (params: {
          row: {
            aggregator: {
              name:
                | string
                | number
                | bigint
                | boolean
                | ReactElement<any, string | JSXElementConstructor<any>>
                | Iterable<ReactNode>
                | ReactPortal
                | Promise<AwaitedReactNode>
                | null
                | undefined;
            };
          };
        }) => {
          return <p className="w-[150px]">{params?.row?.aggregator?.name}</p>;
        },
      };
    case "password":
      return {
        ...el,
        renderCell: (params: { value: string | any[] }) => {
          return (
            <p className="w-[150px]">
              {/* @ts-ignore */}
              {Array.from(
                { length: params?.value?.length },
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                (_, i) => "*",
              )}
            </p>
          );
        },
      };
    case "isVerified":
      return {
        ...el,
        renderCell: (params: { value: any }) => {
          return (
            <p className="w-[150px]">
              {params?.value ? "Validated" : "Not Validated"}
            </p>
          );
        },
      };

    case "validate on":
      return {
        ...el,
        renderCell: (params: {
          row: { aggregator: { updatedAt: moment.MomentInput } };
        }) => {
          return (
            <p className="w-[150px]">
              {moment(params?.row.aggregator.updatedAt).format("DD/MM/YY")}
            </p>
          );
        },
      };

    case "No of Jobs Samples":
      return {
        ...el,
        renderCell: () => {
          return <p>4</p>;
        },
      };

    case "Last job updated":
      return {
        ...el,
        renderCell: (params: {
          row: {
            aggregator: {
              createdAt:
                | string
                | number
                | bigint
                | boolean
                | ReactElement<any, string | JSXElementConstructor<any>>
                | Iterable<ReactNode>
                | ReactPortal
                | Promise<AwaitedReactNode>
                | null
                | undefined;
            };
          };
        }) => {
          return <p>{params?.row.aggregator.createdAt}</p>;
        },
      };
    default:
      return null;
  }
};
