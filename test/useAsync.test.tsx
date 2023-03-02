import { renderHook, waitFor } from "@testing-library/react";
import { useAsync } from "../src";

let asyncTest = jest.fn(
  (a: number = 1, b: number = 1) =>
    new Promise((resolve) => {
      resolve(a + b);
    })
);

function getAsyncState(
  key: "init" | "loading" | "loaded" | "error",
  errorMessage: string | null = null
) {
  return {
    init: false,
    loading: false,
    loaded: false,
    error: false,
    errorMessage,
    [key]: true,
  };
}

describe("Atoms Hook", () => {
  beforeEach(() => {
    asyncTest = jest.fn(
      (a: number = 1, b: number = 1) =>
        new Promise((resolve, reject) => {
          if (a + b === 0) {
            reject("invalid");
            return;
          }

          resolve(a + b);
        })
    );
  });

  test("useAtom - success", async () => {
    const { result } = renderHook(() => useAsync(asyncTest));

    expect(result.current[1]).toMatchObject(getAsyncState("init"));

    result.current[0](4, 5);

    await waitFor(() => {
      expect(asyncTest).toHaveBeenCalledWith(4, 5);
    });

    await waitFor(() => {
      expect(result.current[1]).toMatchObject(getAsyncState("loading"));
    });

    await waitFor(() => {
      expect(result.current[1]).toMatchObject(getAsyncState("loaded"));
      expect(result.current[2]).toEqual(9);
    });
  });

  test("useAtom - success from loading", async () => {
    const { result } = renderHook(() =>
      useAsync(asyncTest, {
        initialStatus: "loading",
      })
    );

    expect(result.current[1]).toMatchObject(getAsyncState("loading"));

    result.current[0]();

    await waitFor(() => {
      expect(result.current[1]).toMatchObject(getAsyncState("loading"));
    });

    await waitFor(() => {
      expect(result.current[1]).toMatchObject(getAsyncState("loaded"));
      expect(result.current[2]).toEqual(2);
    });
  });

  test("useAtom - runOnMountArgs", async () => {
    const { result } = renderHook(() =>
      useAsync(asyncTest, {
        runOnMountArgs: [],
      })
    );

    expect(result.current[1]).toMatchObject(getAsyncState("init"));

    await waitFor(() => {
      expect(asyncTest).toHaveBeenCalledTimes(1);
    });

    await waitFor(() => {
      expect(result.current[1]).toMatchObject(getAsyncState("loading"));
    });

    await waitFor(() => {
      expect(result.current[1]).toMatchObject(getAsyncState("loaded"));
      expect(result.current[2]).toEqual(2);
    });
  });

  test("useAtom - runOnMountArgs with arg", async () => {
    const { result } = renderHook(() =>
      useAsync(asyncTest, {
        runOnMountArgs: [4, 5],
      })
    );

    expect(result.current[1]).toMatchObject(getAsyncState("init"));

    await waitFor(() => {
      expect(asyncTest).toHaveBeenCalledWith(4, 5);
    });

    await waitFor(() => {
      expect(result.current[1]).toMatchObject(getAsyncState("loading"));
    });

    await waitFor(() => {
      expect(result.current[1]).toMatchObject(getAsyncState("loaded"));
      expect(result.current[2]).toEqual(9);
    });
  });

  test("useAtom - startDelay and responseDelay", async () => {
    const { result } = renderHook(() =>
      useAsync(asyncTest, {
        startDelay: 100,
        responseDelay: 100,
      })
    );

    expect(result.current[1]).toMatchObject(getAsyncState("init"));
    result.current[0]();

    const time = performance.now();

    await waitFor(() => {
      expect(asyncTest).toHaveBeenCalledTimes(1);
    });

    expect(performance.now() - time).toBeGreaterThan(100);
    expect(performance.now() - time).toBeLessThan(110);

    await waitFor(() => {
      expect(result.current[1]).toMatchObject(getAsyncState("loading"));
    });

    await waitFor(() => {
      expect(result.current[1]).toMatchObject(getAsyncState("loaded"));
      expect(result.current[2]).toEqual(2);
    });

    expect(performance.now() - time).toBeGreaterThan(200);
    expect(performance.now() - time).toBeLessThan(220);
  });

  test("useAtom - onError", async () => {
    const onError = jest.fn();

    const { result } = renderHook(() =>
      useAsync(asyncTest, {
        onError,
      })
    );

    expect(result.current[1]).toMatchObject(getAsyncState("init"));

    result.current[0](0, 0).catch(() => {});

    await waitFor(() => {
      expect(result.current[1]).toMatchObject(getAsyncState("loading"));
    });

    await waitFor(() => {
      expect(asyncTest).toHaveBeenCalledTimes(1);
    });

    await waitFor(() => {
      expect(result.current[1]).toMatchObject(
        getAsyncState("error", "invalid")
      );
      expect(result.current[2]).toEqual(null);
      expect(onError).toHaveBeenCalledTimes(1);
    });
  });
});
