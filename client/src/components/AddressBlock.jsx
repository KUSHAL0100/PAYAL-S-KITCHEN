const CompactAddress = ({ address, label, variant = "light" }) => {
  if (!address?.street) return null;

  const isDark = variant === "dark";

  return (
    <div className="flex flex-col leading-tight">
      <div className="flex items-start gap-1">
        {label && (
          <div className="flex flex-col items-center mt-0.5">
            {label.split("").map((char, i) => (
              <span
                key={i}
                className={`text-[8px] font-black ${char === "L" ? "text-orange-600" : (isDark ? "text-blue-400" : "text-blue-600")
                  }`}
              >
                {char}
              </span>
            ))}
          </div>
        )}
        <span className={`text-[10px] font-bold break-words max-w-[150px] ${isDark ? "text-gray-100" : "text-gray-900"
          }`}>
          {address.street}
        </span>
      </div>
      <span className={`text-[9px] ml-3 font-medium ${isDark ? "text-gray-400" : "text-gray-500"
        }`}>
        {address.city}
      </span>
    </div>
  );
};

const AddressBlock = ({ mealType, lunchAddress, dinnerAddress, variant = "light" }) => {
  const isDual =
    lunchAddress?.street &&
    dinnerAddress?.street &&
    (lunchAddress.street !== dinnerAddress.street ||
      lunchAddress.city !== dinnerAddress.city);

  const isDark = variant === "dark";

  if (mealType === "both" && isDual) {
    return (
      <div className="flex flex-col gap-2 py-1">
        <CompactAddress address={lunchAddress} label="L" variant={variant} />
        <div className={`border-t pt-1 ${isDark ? "border-white/10" : "border-gray-100"}`}>
          <CompactAddress address={dinnerAddress} label="D" variant={variant} />
        </div>
      </div>
    );
  }

  // Determine label based on mealType
  let label = "";
  if (mealType === "both") label = "LD";
  else if (mealType === "lunch") label = "L";
  else if (mealType === "dinner") label = "D";
  else if (mealType === "event") label = "E";
  else if (mealType === "single") label = "S";
  else label = mealType ? mealType.charAt(0).toUpperCase() : "";

  const addr =
    (mealType === "dinner" ? dinnerAddress : lunchAddress) ||
    lunchAddress ||
    dinnerAddress;

  return addr?.street ? (
    <div className="py-1">
      <CompactAddress address={addr} label={label} variant={variant} />
    </div>
  ) : (
    <span className={`text-xs italic ${isDark ? "text-gray-500" : "text-gray-400"}`}>No address set</span>
  );
};

export default AddressBlock;
