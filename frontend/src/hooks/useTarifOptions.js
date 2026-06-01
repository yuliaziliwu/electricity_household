import { useEffect, useState } from "react";

import { getDayaOptions } from "api/tarifApi";

const fallbackDayaOptions = [
  { daya_va: 450 },
  { daya_va: 900 },
  { daya_va: 1300 },
  { daya_va: 2200 },
  { daya_va: 3500 },
];

export default function useTarifOptions() {
  const [options, setOptions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [isFallback, setIsFallback] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function loadOptions() {
      try {
        const data = await getDayaOptions();
        if (!isMounted) {
          return;
        }

        setOptions(data);
        setIsFallback(false);
        setError("");
      } catch (err) {
        if (!isMounted) {
          return;
        }

        setOptions(fallbackDayaOptions);
        setIsFallback(true);
        setError(err.message);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadOptions();

    return () => {
      isMounted = false;
    };
  }, []);

  return {
    options,
    isLoading,
    error,
    isFallback,
  };
}
