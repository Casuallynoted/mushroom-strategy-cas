import {Helper} from "../Helper";
import {AbstractView} from "./AbstractView";

/**
 * Home View Class.
 *
 * Used to create a Home view.
 *
 * @class HomeView
 * @extends AbstractView
 */
class HomeView extends AbstractView {
  /**
   * Default options for the view.
   *
   * @type {viewOptions}
   * @private
   */
  #defaultOptions = {
    title: "Home",
    path: "home",
    subview: false,
  };

  /**
   * Class constructor.
   *
   * @param {viewOptions} [options={}] Options for the view.
   */
  constructor(options = {}) {
    super();
    this.mergeOptions(
        this.#defaultOptions,
        options,
    );
  }

  /**
   * Create the cards to include in the view.
   *
   * @return {Promise} A promise of a card object array.
   * @override
   */
  async createViewCards() {
    return await Promise.all([
      this.#createChips(),
      this.#createPersonCards(),
      this.#createAreaCards(),
    ]).then(([chips, personCards, areaCards]) => {
      const options       = Helper.strategyOptions;
      const homeViewCards = [
        {
          type: "custom:mushroom-chips-card",
          alignment: "center",
          chips: chips,
        },
        {
          type: "horizontal-stack",
          cards: personCards,
        }
      ];

      // Add quick access cards.
      if (options.quick_access_cards) {
        homeViewCards.push(...options.quick_access_cards);
      }

      // Add area cards.
      homeViewCards.push({
        type: "vertical-stack",
        cards: areaCards,
      });

      // Add custom cards.
      if (options.extra_cards) {
        homeViewCards.push(...options.extra_cards);
      }

      return homeViewCards;
    });
  }

  /**
   * Create the chips to include in the view.
   *
   * @return {Object[]} A chip object array.
   */
  async #createChips() {
    const chips       = [];
    const chipOptions = Helper.strategyOptions.chips;

    // TODO: Get domains from config.
    const exposed_chips = ["light", "fan", "cover", "switch", "climate"];
    // Create a list of area-ids, used for switching all devices via chips
    const areaIds       = Helper.areas.map(area => area.area_id);

    let chipModule;

    // Weather chip.
    const weatherEntityId = chipOptions?.weather_entity ?? Helper.entities.find(
        entity => entity.entity_id.startsWith("weather.") && entity.disabled_by == null && entity.hidden_by == null,
    )?.entity_id;

    if (weatherEntityId) {
      try {
        chipModule        = await import("../chips/WeatherChip");
        const weatherChip = new chipModule.WeatherChip(weatherEntityId);
        chips.push(weatherChip.getChip());
      } catch (e) {
        console.error(Helper.debug ? e : "An error occurred while creating the weather chip!");
      }
    }

    // Numeric chips.
    for (let chipType of exposed_chips) {
      if (chipOptions?.[`${chipType}_count`] ?? true) {
        const className = Helper.sanitizeClassName(chipType + "Chip");
        try {
          chipModule = await import((`../chips/${className}`));
          const chip = new chipModule[className](areaIds);
          chips.push(chip.getChip());
        } catch (e) {
          console.error(Helper.debug ? e : `An error occurred while creating the ${chipType} chip!`);
        }
      }
    }

    // Extra chips.
    if (chipOptions?.extra_chips) {
      chips.push(...chipOptions.extra_chips);
    }

    return chips;
  }

  /**
   * Create the person cards to include in the view.
   *
   * @return {Object[]} A card object array.
   */
  #createPersonCards() {
    const cards = [];

    import("../cards/PersonCard").then(personModule => {
      for (const person of Helper.entities.filter(entity => {
        return entity.entity_id.startsWith("person.")
            && entity.hidden_by == null
            && entity.disabled_by == null;
      })) {
        cards.push(new personModule.PersonCard(person).getCard());
      }
    });

    return cards;
  }

  /**
   * Create the area cards to include in the view.
   *
   * Area cards are grouped into two areas per row.
   *
   * @return {Object[]} A card object array.
   */
  async #createAreaCards() {
    /**
     * Cards to be stacked vertically.
     *
     * Contains a Title card and horizontal stacks of Area cards.
     *
     * @type {[{}]}
     */
    const groupedCards = [
      {
        type: "custom:mushroom-title-card",
        title: "Areas",
      },
    ];
    let areaCards      = [];

    for (const [i, area] of Helper.areas.entries()) {
      let module;
      let moduleName =
              Helper.strategyOptions.areas[area.area_id ?? "undisclosed"]?.type ??
              Helper.strategyOptions.areas["_"]?.type ??
              "default";

      // Load module by type in strategy options.
      try {
        module = await import((`../cards/${moduleName}`));
      } catch (e) {
        // Fallback to the default strategy card.
        module = await import("../cards/AreaCard");

        if (Helper.strategyOptions.debug && moduleName !== "default") {
          console.error(e);
        }
      }

      let cardOptions   = Helper.strategyOptions.areas[area.area_id ?? "undisclosed"];
      let temperature = Helper.strategyOptions.areas[area.area_id]?.temperature;
      let humidity = Helper.strategyOptions.areas[area.area_id]?.humidity;
      let lux = Helper.strategyOptions.areas[area.area_id]?.illuminance;
      let window = Helper.strategyOptions.areas[area.area_id]?.window;
      let lock = Helper.strategyOptions.areas[area.area_id]?.lock;
      let door = Helper.strategyOptions.areas[area.area_id]?.door;
      let motion = Helper.strategyOptions.areas[area.area_id]?.motion ?? Helper.strategyOptions.areas[area.area_id]?.occupancy ?? Helper.strategyOptions.areas[area.area_id]?.presence;
      let cover = Helper.strategyOptions.areas[area.area_id]?.cover;

      let chips = []
      
      // Search for sensors if not configured
      const findStates = (area, entity_type, device_class = null) => {
        let found = []
        const entities = Helper.getDeviceEntities(area, entity_type);
        if (entities.length) {
          const entitiesStates = Helper.getStateEntities(area, entity_type);
          for (const entity of entities) {
            const state = entitiesStates.find(state => state.entity_id === entity.entity_id);
            if (state.state === "unavailable") {
              continue;
            }
            if (device_class
              && Array.isArray(device_class)
                ? !device_class.includes(state.attributes.device_class)
                : device_class !== state.attributes.device_class
            ) {
              continue;
            }
            found.push(state)
          }
        }
        return found
      }
      const makeChip = (type, entity_id, options = {}, condition = {state: 'on'}) => {
        const chip = {
          type: 'entity',
          content_info: 'none',
          tap_action: {
            action: 'toggle'
          },
          double_tap_action: {
            action: 'more-info'
          },
          hold_action: {
            action: 'more-info'
          },
          entity: entity_id,
          ...options,
        }

        return type !== 'conditional' ? chip : {
          type,
          conditions: [
            {
              entity: entity_id,
              ...condition
            }
          ],
          chip
        }
      }

      if (!temperature) {
        temperature = findStates(area, "sensor", "temperature")[0]?.entity_id
      }
      if (!humidity) {
        humidity = findStates(area, "sensor", "humidity")[0]?.entity_id
      }
      if (!lux) {
        lux = findStates(area, "sensor", "illuminance")[0]?.entity_id
      }
      if (!motion) {
        motion = findStates(area, "binary_sensor", ["motion", "occupancy", "presence"])[0]?.entity_id
      }
      if (!lock) {
        lock = findStates(area, "lock")[0]?.entity_id || findStates(area, "binary_sensor", "lock")[0]?.entity_id
      }
      if (!window) {
        window = findStates(area, "binary_sensor", "window")[0]?.entity_id
      }
      if (!door) {
        door = findStates(area, "binary_sensor", "door")[0]?.entity_id
      }

      // If configured or found, create template

      const co2EntityIds = findStates(area, "sensor").filter(state => {
        return 'carbon_dioxide' === state.attributes.device_class
      }).map(state => state.entity_id)
      if (temperature || humidity || lux || co2EntityIds.length) {
        let secondary = [];
        if (temperature) {
          secondary.push(`🌡️{{ states('${temperature}') | int }}°`)
        }
        if (humidity) {
          secondary.push(`💧{{ states('${humidity}') | int }}%`)
        }
        // if (lux) {
        //   secondary.push(`☀️{{ states('${lux}') | int }}lx`)
        // }
        co2EntityIds.forEach(entityId => {
          secondary.push(`😶‍🌫️{{ states('${entityId}') }}{{ state_attr('${entityId}', 'unit_of_measurement') or '' }}`)
        })
        cardOptions = {
          ...{
            secondary: secondary.join(' '),
            multiline_secondary: true
          },
          ...cardOptions,
        }
      }
      if (motion) {
        chips.push(makeChip('conditional', motion, {
          icon: 'mdi:motion-sensor',
          tap_action: {
            action: 'more-info'
          }
        }))
      }

      findStates(area, "cover").forEach(state => {
        chips.push(makeChip('entity', state.entity_id))
      });

      findStates(area, "climate").forEach(state => {
        chips.push(makeChip('conditional', state.entity_id, {}, {state_not: "off"}))
      })

      // If configured or found, create template
      let badgeConditions = []
      if (lock) {
        badgeConditions.push({entity: lock, state: 'unlocked', icon: 'mdi:lock-open'})
      }
      if (window) {
        badgeConditions.push({entity: window, state: 'on', icon: 'mdi:window-open-variant'})
      }
      if (door) {
        badgeConditions.push({entity: door, state: 'on', icon: 'mdi:door-open'})
      }
      if (badgeConditions.length) {
        let badge = badgeConditions
          .map(condition => `is_state('${condition.entity}', '${condition.state}') %}${condition.icon}{%`)
          .join(' elif ')
        badge = `{% if ${badge} endif %}`

        cardOptions = {
          ...{
            badge_icon: badge,
            badge_color: "red",
          },
          ...cardOptions,
        }
      }

      // Get a card for the area.
      if (!Helper.strategyOptions.areas[area.area_id]?.hidden) {
        let card = new module.AreaCard(area, cardOptions).getCard()
        if (chips.length) {
          console.log('wrapping in stack', {cardOptions, card, chips})
          // See https://community.home-assistant.io/t/mushroom-cards-build-a-beautiful-dashboard-easily/388590/8146
          card = {
            type: 'custom:stack-in-card',
            mode: 'vertical',
            cards: [
              {
                ...card,
                card_mod: {
                  style: `ha-card {
                    border: none;
                  }`
                }
              },
              {
                type: 'custom:mushroom-chips-card',
                chips: chips.map(chip => {
                  const card_mod = {
                    style: `:host {
                      --chip-height: 25px;
                      --chip-box-shadow: 0px 1px 4px rgba(0,0,0,0.2);
                      --chip-border-width: 0px;
                      --chip-spacing: 2px;
                    }
                    `
                  }
                  if (chip.type === 'conditional') {
                    return {
                      ...chip,
                      chip: {
                        ...chip.chip,
                        card_mod,
                      }
                    }
                  }

                  return {
                    ...chip,
                    card_mod
                  }
                }),
                alignment: 'justify'
              }
            ],
            
          }
          console.log('wrapped in stack', {card})
        }

        areaCards.push(card);
      }

      // Horizontally group every two area cards if all cards are created.
      if (i === Helper.areas.length - 1) {
        for (let i = 0; i < areaCards.length; i += 2) {
          groupedCards.push({
            type: "horizontal-stack",
            cards: areaCards.slice(i, i + 2),
          });
        }
      }
    }

    return groupedCards;
  }
}

export {HomeView};
