import {
  Dispatch,
  SetStateAction,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { v4 } from "uuid";

export type UseAsyncStatus = {
  init: boolean;
  loading: boolean;
  loaded: boolean;
  error: boolean;
  errorMessage: any;
};
export type UseAsyncFunction<A extends any[], T> = (...data: A) => Promise<T>;
export type UseAsyncOptions<A> = {
  startDelay?: number;
  responseDelay?: number;
  initialStatus?: keyof UseAsyncStatus;
  runOnMountArgs?: A;
  onError?: (error: any) => void;
};
export type UseAsyncReturn<A extends any[], T> = [
  UseAsyncFunction<A, T>,
  UseAsyncStatus,
  T | null,
  Dispatch<SetStateAction<T | null>>
];

const CLEAN_STATUS: UseAsyncStatus = {
  init: false,
  loading: false,
  loaded: false,
  error: false,
  errorMessage: null,
};

/**
 *
 * @param {UseAsyncFunction} asyncFunction function to be executed
 * @param {UseAsyncOptions} [options = {}] options. Default: {}.
 * @param {number} [options.startDelay = 100] time(ms) before executing the function. Default: 100ms.
 * @param {number} [options.responseDelay = 250] minimum time(ms) for function execution. Default: 250ms.
 * @param {number} [options.initialStatus = "init"] status on mount. Default: "init".
 * @param {any[]} [options.runOnMountArgs] will trigger the asycn function on mount and pass provided arguments.
 * @param {() => void} [options.onError]
 * @returns {UseAsyncReturn} [ exec, status, value ]
 */
export function useAsync<A extends any[], T>(
  asyncFunction: UseAsyncFunction<A, T>,
  {
    startDelay = 100,
    responseDelay = 250,
    initialStatus = "init",
    runOnMountArgs,
    onError,
  }: UseAsyncOptions<A> = {}
): UseAsyncReturn<A, T> {
  const mounted = useRef(true);
  const currentExec = useRef(v4());
  const [status, setStatus] = useState<UseAsyncStatus>({
    ...CLEAN_STATUS,
    [initialStatus]: true,
  });
  const [value, setValue] = useState<T | null>(null);

  // The exec function wraps asyncFunction and
  // handles setting state for pending, value, and error.
  // useCallback ensures the below useEffect is not called
  // on every render, but only if asyncFunction changes.
  const exec = useCallback(
    (...data: A) => {
      const currentExecId = v4();
      currentExec.current = currentExecId; // on multiple triggers only latest will get response

      return new Promise<T>(async (resolve, reject) => {
        if (startDelay) {
          await new Promise((resolveDelay) => {
            setTimeout(resolveDelay, startDelay);
          });
        }

        // make sure component is still mounted
        if (!mounted.current) {
          return;
        }

        setStatus({
          ...CLEAN_STATUS,
          loading: true,
        });

        const delay = new Promise<void>((resolveDelay) => {
          if (!responseDelay) {
            resolveDelay();
            return;
          }
          setTimeout(resolveDelay, responseDelay);
        });

        try {
          const response = await asyncFunction(...data);
          await delay;

          if (!mounted.current || currentExec.current !== currentExecId) {
            return;
          }

          //   unstable_batchedUpdates(() => {
          setValue(response);
          setStatus({
            ...CLEAN_STATUS,
            loaded: true,
          });
          resolve(response);
          //   });
        } catch (error) {
          await delay;

          if (!mounted.current || currentExec.current !== currentExecId) {
            return;
          }

          onError?.(error);
          //   unstable_batchedUpdates(() => {
          setValue(null);
          setStatus({
            ...CLEAN_STATUS,
            error: true,
            errorMessage: error,
          });
          reject(error);
        }
      });
    },
    [asyncFunction, startDelay, responseDelay, onError]
  );

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  useEffect(() => {
    if (runOnMountArgs) {
      exec(...runOnMountArgs);
    }
  }, []);

  return [exec, status, value, setValue];
}
