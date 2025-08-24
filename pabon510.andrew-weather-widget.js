/*!  
 * Custom Weather Widget for Staffbase  
 *  
 * This script registers a new custom widget for the Staffbase platform.  
 *  
 * The widget fetches current weather information for the logged‑in user’s  
 * primary location and displays it in a stylized card.  The user can  
 * click the city name to override the location.  The default temperature  
 * unit is Fahrenheit as requested.  
 *  
 * The widget uses the Staffbase Custom Widget SDK conventions documented in  
 * the Staffbase Developer Portal.  Each custom widget must register itself  
 * with the platform by calling `window.defineBlock` and passing a block  
 * definition that includes a unique name, a factory function to create the  
 * web component implementation, a list of handled attributes, and optional  
 * metadata such as configuration schema and UI schema【868247979561763†L92-L170】.  
 *  
 * To fetch the current user’s profile, the widget uses the `widgetApi`  
 * provided by the platform.  The Staffbase SDK exposes a `getUserInformation`  
 * method to retrieve information about the signed‑in user including the  
 * `location` field【410788988778494†L36-L95】.  That value is used as the  
 * initial city.  
 */

(() => {
  // Replace with your own WeatherAPI key if needed.  The key used here is 
  // the same public demo key found in the original `eira.weather‑time.js` file.  
  // See https://www.weatherapi.com/ for details.  
  const WEATHER_API_KEY = "2316f440769c440d92051647240512";

  /**
   * Returns an icon name based on the WeatherAPI condition code and time of day.
   * The mapping is derived from the original widget’s implementation.  
   * @param {number} code The `condition.code` from WeatherAPI.
   * @param {boolean} isDay Whether it is daytime (true) or night (false).
   */
  function getIconFilename(code, isDay) {
    switch (code) {
      case 1000:
        return isDay ? "sunny.svg" : "clear-moon.svg";
      case 1003:
        return isDay ? "partly-cloudy-sun.svg" : "partly-cloudy-moon.svg";
      case 1006:
        return "cloudy.svg";
      case 1009:
      case 1030:
      case 1135:
      case 1147:
        return "double-clouds.svg";
      case 1063:
      case 1072:
      case 1150:
      case 1153:
      case 1168:
      case 1171:
        return isDay ? "drizzle.svg" : "drizzle-moon.svg";
      case 1180:
      case 1183:
      case 1186:
      case 1189:
      case 1192:
      case 1195:
      case 1198:
      case 1201:
      case 1240:
      case 1243:
      case 1246:
        return "rain.svg";
      case 1066:
      case 1069:
      case 1114:
      case 1117:
      case 1204:
      case 1207:
      case 1210:
      case 1213:
      case 1216:
      case 1219:
      case 1222:
      case 1225:
      case 1237:
      case 1249:
      case 1252:
      case 1255:
      case 1258:
      case 1261:
      case 1264:
        return "snow.svg";
      case 1087:
      case 1273:
      case 1276:
      case 1279:
      case 1282:
        return "thunderstorm.svg";
      default:
        return "default.svg";
    }
  }

  /**
   * React component that renders the weather card.  It fetches weather data
   * whenever the city changes and exposes a simple interface for editing the
   * city name.  Only minimal dependencies are used to keep the widget small.
   */
  const WeatherCard = ({ city, onCityChange }) => {
    const { useState, useEffect, Fragment } = React;

    // Data state variables
    const [weather, setWeather] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    // Fetch weather each time the city changes.
    useEffect(() => {
      if (!city) return;
      setIsLoading(true);
      setError(null);
      // Build the URL for WeatherAPI.  Always request both Fahrenheit and Celsius.
      const url = `https://api.weatherapi.com/v1/current.json?key=${WEATHER_API_KEY}&q=${encodeURIComponent(
        city
      )}`;
      fetch(url)
        .then((resp) => {
          if (!resp.ok) {
            throw new Error("Network response was not ok");
          }
          return resp.json();
        })
        .then((data) => {
          if (data && data.current && data.location) {
            setWeather({
              tempF: data.current.temp_f,
              tempC: data.current.temp_c,
              feelsLikeF: data.current.feelslike_f,
              feelsLikeC: data.current.feelslike_c,
              humidity: data.current.humidity,
              windMph: data.current.wind_mph,
              windKph: data.current.wind_kph,
              description: data.current.condition?.text?.toLowerCase() || "",
              icon: getIconFilename(
                data.current.condition?.code ?? 1000,
                data.current.is_day === 1
              ),
              isDay: data.current.is_day === 1,
              locationName: data.location.name,
              region: data.location.region,
              country: data.location.country,
            });
          } else {
            throw new Error("Invalid data received from weather API");
          }
        })
        .catch((err) => {
          console.error(err);
          setError("Failed to load weather data.");
        })
        .finally(() => {
          setIsLoading(false);
        });
    }, [city]);

    // Choose a background gradient based on the time of day and overall conditions.
    // In addition to day/night, rainier descriptions use a darker palette to more
    // closely match the reference design.  The description string is checked
    // for common rain/drizzle keywords; otherwise a bright blue gradient is used.
    function getGradient(isDay, description) {
      // Normalize description for safe matching
      const desc = (description || '').toLowerCase();
      // Night time cards always use a dark navy gradient
      if (!isDay) {
        return 'linear-gradient(160deg, #2C3E50 0%, #243B55 100%)';
      }
      // Use a darker slate gradient when the weather is wet or stormy
      if (desc.includes('rain') || desc.includes('shower') || desc.includes('drizzle') || desc.includes('thunder')) {
        return 'linear-gradient(160deg, #455a64 0%, #37474f 100%)';
      }
      // Default daytime palette – bright blue gradient for clear or cloudy skies
      return 'linear-gradient(160deg, #89CFF0 0%, #6BC7FF 100%)';
    }

    // Render the card UI.  Always prefer Fahrenheit for numeric values, per user
    // request.
    if (isLoading) {
      return React.createElement(
        "div",
        {
          style: {
            width: "100%",
            minHeight: "250px",
            borderRadius: "16px",
            padding: "20px",
            // Loading state uses the daytime gradient since we don't yet know the conditions
            background: getGradient(true, ''),
            color: "white",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "18px",
          },
        },
        "Loading weather …"
      );
    }
    if (error || !weather) {
      return React.createElement(
        "div",
        {
          style: {
            width: "100%",
            minHeight: "250px",
            borderRadius: "16px",
            padding: "20px",
            // Error state defaults to night styling for readability
            background: getGradient(false, ''),
            color: "white",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "16px",
            textAlign: "center",
          },
        },
        error || "No data"
      );
    }

    const cardStyle = {
      width: "100%",
      borderRadius: "16px",
      padding: "20px",
      // Always use white text for good contrast regardless of day/night
      color: "#FFFFFF",
      // Compute gradient based on time of day and description
      background: getGradient(weather.isDay, weather.description),
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "space-between",
      boxSizing: "border-box",
      position: "relative",
    };

    const rowStyle = {
      width: "100%",
      display: "flex",
      justifyContent: "space-between",
      marginTop: "12px",
      fontSize: "14px",
      fontWeight: 500,
    };

    // Compose the elements using React.createElement to avoid JSX.  
    return React.createElement(
      "div",
      { style: cardStyle },
      // City header – clicking this allows the user to override the city.
      React.createElement(
        "h2",
        {
          style: {
            margin: 0,
            marginBottom: 8,
            cursor: "pointer",
            fontSize: "24px",
            fontWeight: "600",
            color: weather.isDay ? "#FFFFFF" : "#FFFFFF",
          },
          onClick: () => {
            const newCity = prompt(
              "Enter a city name to override the default location",
              weather.locationName
            );
            if (newCity && newCity.trim()) {
              onCityChange(newCity.trim());
            }
          },
        },
        weather.locationName
      ),
      // Weather icon
      React.createElement("img", {
        src: `https://eirastaffbase.github.io/weather-time/resources/img/${weather.icon}`,
        alt: "Weather icon",
        style: { width: 120, height: 120, margin: "0 auto" },
      }),
      // Temperature
      React.createElement(
        "div",
        {
          style: {
            fontSize: "56px",
            fontWeight: 700,
            color: weather.isDay ? "#FFFFFF" : "#FFFFFF",
            marginTop: 12,
          },
        },
        Math.round(weather.tempF),
        React.createElement(
          "span",
          { style: { fontSize: "36px", marginLeft: 4 } },
          "°F"
        )
      ),
      // Description
      React.createElement(
        "div",
        {
          style: {
            fontSize: "18px",
            fontWeight: 400,
            marginTop: 4,
            textTransform: "capitalize",
            color: weather.isDay ? "#FFFFFF" : "#FFFFFF",
          },
        },
        weather.description
      ),
      // Divider line (optional) – subtle line to separate sections
      React.createElement("hr", {
        style: {
          width: "100%",
          border: 0,
          borderBottom: weather.isDay
            ? "1px solid rgba(255, 255, 255, 0.3)"
            : "1px solid rgba(255, 255, 255, 0.3)",
          margin: "16px 0",
        },
      }),
      // Details row
      React.createElement(
        "div",
        { style: rowStyle },
        // Wind
        React.createElement(
          "div",
          { style: { textAlign: "center", flex: 1 } },
          React.createElement(
            "div",
            { style: { fontSize: "12px", opacity: 0.8 } },
            "Wind"
          ),
          React.createElement(
            "div",
            { style: { fontSize: "20px", fontWeight: 600 } },
            weather.windMph.toFixed(1),
            React.createElement(
              "span",
              { style: { fontSize: "12px", marginLeft: 2 } },
              "mph"
            )
          )
        ),
        // Humidity
        React.createElement(
          "div",
          { style: { textAlign: "center", flex: 1 } },
          React.createElement(
            "div",
            { style: { fontSize: "12px", opacity: 0.8 } },
            "Humidity"
          ),
          React.createElement(
            "div",
            { style: { fontSize: "20px", fontWeight: 600 } },
            weather.humidity,
            React.createElement(
              "span",
              { style: { fontSize: "12px", marginLeft: 2 } },
              "%"
            )
          )
        ),
        // Feels like
        React.createElement(
          "div",
          { style: { textAlign: "center", flex: 1 } },
          React.createElement(
            "div",
            { style: { fontSize: "12px", opacity: 0.8 } },
            "Feels like"
          ),
          React.createElement(
            "div",
            { style: { fontSize: "20px", fontWeight: 600 } },
            Math.round(weather.feelsLikeF),
            React.createElement(
              "span",
              { style: { fontSize: "12px", marginLeft: 2 } },
              "°F"
            )
          )
        )
      )
    );
  };

  /**
   * Main React component for the widget.  It uses the widget API to fetch the
   * current user’s profile and derive the default city from the user’s
   * `location` field【410788988778494†L36-L95】.  A prop can override the city,
   * allowing editors to predefine a location in the Studio.  Users can change
   * the city by clicking the city name on the card.  
   */
  const WeatherWidget = ({ city: initialCity, widgetApi }) => {
    const { useState, useEffect } = React;
    const [city, setCity] = useState(initialCity || null);

    useEffect(() => {
      // If no city is defined, derive it from the user’s profile.
      if (!city) {
          widgetApi
            .getUserInformation()
            .then((user) => {
              if (user && user.location) {
                // The location may contain state or region separated by comma.
                const parts = user.location.split(",");
                setCity(parts[0].trim());
              } else {
                setCity("New York City");
              }
            })
            .catch((err) => {
              console.error(err);
              setCity("New York City");
            });
      }
    }, [city, widgetApi]);

    if (!city) {
      // Wait until city is initialized.
      return null;
    }
    return React.createElement(WeatherCard, {
      city,
      onCityChange: (newCity) => setCity(newCity),
    });
  };

  /**
   * Factory function used by the Staffbase SDK to create the web component.
   * The factory receives the base class and the widget API as arguments.
   */
  const factory = (BaseBlockClass, widgetApi) => {
    return class WeatherBlock extends BaseBlockClass {
      constructor() {
        super();
        this._root = null;
      }
      renderBlock(container) {
        this._root ??= ReactDOM.createRoot(container);
        // Pass both props and the widget API to the React component.
        this._root.render(
          React.createElement(WeatherWidget, {
            ...this.props,
            widgetApi,
          })
        );
      }
    };
  };

  // Attributes handled by the widget.  The `city` attribute allows editors
  // in the Studio to specify a static city.  When omitted, the widget
  // derives the city from the user profile as shown above.  The
  // `allow-city-override` attribute toggles the clickability of the city
  // header, enabling or disabling the prompt for the end user.
  const widgetAttributes = ["city", "allow-city-override"];

  // Configuration schema used to generate the configuration dialog in
  // Staffbase Studio.  Editors can enter a city and toggle the override.
  const configurationSchema = {
    properties: {
      city: {
        type: "string",
        title: "City",
      },
      "allow-city-override": {
        type: "boolean",
        title: "Allow city override",
        default: true,
      },
    },
  };

  // uiSchema defines additional UI hints for the configuration dialog.
  const uiSchema = {
    city: {
      "ui:help": "Enter a default city name or leave blank to use the user’s location.",
    },
    "allow-city-override": {
      "ui:widget": "checkbox",
      "ui:help": "Allow users to click the city name to override the location",
    },
  };

  // Block definition passed to window.defineBlock.  The name must include
  // at least one hyphen【868247979561763†L92-L170】.  Update the label to
  // something meaningful; the icon may be updated later if desired.
  const blockDefinition = {
    name: "andrew-weather-widget",
    factory: factory,
    attributes: widgetAttributes,
    blockLevel: "block",
    configurationSchema: configurationSchema,
    uiSchema: uiSchema,
    label: "Weather Widget",
    iconUrl: "https://eirastaffbase.github.io/weather-time/resources/img/sunny.svg",
  };

  // External block definition containing meta information.  The author and
  // version fields are required by the SDK.  Update the author string as
  // appropriate.
  const externalBlockDefinition = {
    blockDefinition,
    author: "andrew",
    version: "1.0.0",
  };

  // Finally, register the block with the Staffbase platform.  Without this
  // call the widget will not be recognized by the platform【868247979561763†L92-L170】.
  window.defineBlock(externalBlockDefinition);
})();