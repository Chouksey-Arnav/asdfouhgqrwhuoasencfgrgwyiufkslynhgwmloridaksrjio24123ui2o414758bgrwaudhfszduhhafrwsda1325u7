// Physical Sciences — high-school-to-early-undergrad basics (pb01-pb35).
// Companion set to chemPhys.js: kept intentionally introductory (Easy/Medium only),
// covering chemistry, physics, earth/space science, and applied math not in the MCAT-level bank.
export const PHYSICAL_SCIENCES_BASICS = [
{
    id:`pb01`, cat:`Physical Sciences`, title:`Density, Mass & Volume Basics`, diff:`Easy`,
    qs:[
      { q:`What is the correct formula for calculating density?`, ch:[`Mass + Volume`,`Mass x Volume`,`Mass / Volume`,`Volume / Mass`], ans:2, exp:`Density equals mass divided by volume (D = m/V). This tells you how much matter is packed into a given amount of space.` },
      { q:`Which of these is a common unit used to express density?`, ch:[`Newtons`,`Grams per cubic centimeter (g/cm3)`,`Meters per second`,`Joules`], ans:1, exp:`Density is often expressed in g/cm3 for solids and liquids, or kg/m3 in SI units, because it combines a mass unit with a volume unit.` },
      { q:`A block has a mass of 20 g and a volume of 4 cm3. What is its density?`, ch:[`4 g/cm3`,`0.2 g/cm3`,`24 g/cm3`,`5 g/cm3`], ans:3, exp:`Density = mass / volume = 20 g / 4 cm3 = 5 g/cm3. Dividing mass by volume always gives you density.` },
      { q:`What is a common method for finding the volume of an irregularly shaped object?`, ch:[`Using a ruler only`,`Weighing it dry`,`Water displacement`,`Measuring its temperature`], ans:2, exp:`Water displacement works because when you submerge an object, it pushes aside a volume of water exactly equal to its own volume, which you can measure.` },
      { q:`An object will float in a fluid if the object's density is:`, ch:[`Less than the fluid's density`,`Greater than the fluid's density`,`Exactly equal to 1 g/cm3`,`Unrelated to the fluid's density`], ans:0, exp:`Objects less dense than the fluid around them float, while objects denser than the fluid sink. This is why wood floats on water but a steel bolt does not.` },
    ]
  },
  {
    id:`pb02`, cat:`Physical Sciences`, title:`Simple Machines Basics`, diff:`Easy`,
    qs:[
      { q:`Which of the following is NOT one of the six classic simple machines?`, ch:[`Lever`,`Pulley`,`Generator`,`Wedge`], ans:2, exp:`The six simple machines are the lever, pulley, wheel and axle, inclined plane, wedge, and screw. A generator is a more complex device that produces electricity, not a simple machine.` },
      { q:`A seesaw is a classic example of which simple machine?`, ch:[`Pulley`,`Lever`,`Screw`,`Wedge`], ans:1, exp:`A seesaw is a lever: it has a rigid bar that pivots around a fixed point called the fulcrum, letting force applied on one side lift a load on the other.` },
      { q:`The fixed point that a lever pivots around is called the:`, ch:[`Fulcrum`,`Axle`,`Thread`,`Ramp`], ans:0, exp:`The fulcrum is the pivot point of a lever. Where the fulcrum sits relative to the effort and load changes how much the lever helps you.` },
      { q:`An inclined plane (ramp) makes lifting a heavy object easier mainly by:`, ch:[`Eliminating friction entirely`,`Increasing the force needed`,`Reducing the distance traveled`,`Allowing a smaller force to be applied over a longer distance`], ans:3, exp:`A ramp trades distance for force: you push with less force, but you have to push over a longer path, so the total work stays about the same (minus some lost to friction).` },
      { q:`Mechanical advantage describes:`, ch:[`The weight of the machine`,`How much a machine multiplies the input force`,`How fast a machine moves`,`The color of the machine`], ans:1, exp:`Mechanical advantage is a measure of how much a simple machine multiplies the force you put in, letting you move or lift something with less effort.` },
    ]
  },
  {
    id:`pb03`, cat:`Physical Sciences`, title:`Buoyancy & Fluids Basics`, diff:`Medium`,
    qs:[
      { q:`Archimedes' principle states that the buoyant force on an object in a fluid equals:`, ch:[`The object's weight`,`The density of the fluid`,`The volume of the object`,`The weight of the fluid the object displaces`], ans:3, exp:`Archimedes' principle says the upward buoyant force equals the weight of the fluid pushed out of the way (displaced) by the submerged part of the object.` },
      { q:`A large steel ship can float on water mainly because:`, ch:[`Steel is less dense than water`,`Its hollow shape displaces enough water to equal its total weight`,`Steel repels water`,`Ships have no weight once in water`], ans:1, exp:`Even though steel itself is denser than water, the ship's hollow shape spreads its weight over a large volume, so the average density of the whole ship (including the air inside) is less than water's.` },
      { q:`Compared to the surface, water pressure at the bottom of a deep swimming pool is:`, ch:[`Higher`,`Lower`,`The same`,`Zero`], ans:0, exp:`Water pressure increases with depth because there is more water (and weight) pressing down from above. That is why your ears feel pressure when you dive deeper.` },
      { q:`An object that sinks completely in water has a density that is:`, ch:[`Greater than water's density`,`Equal to water's density`,`Less than water's density`,`Impossible to determine`], ans:0, exp:`If an object is denser than the fluid it is placed in, gravity pulling it down wins out over the buoyant force pushing it up, so it sinks.` },
      { q:`When a rubber duck floats calmly on still water, the upward buoyant force is balanced by:`, ch:[`Air pressure only`,`Friction from the water`,`The duck's weight pulling it down due to gravity`,`The temperature of the water`], ans:2, exp:`An object floats at a stable level when the buoyant force pushing up exactly equals its weight (gravity) pulling down, so the two forces cancel out.` },
    ]
  },
  {
    id:`pb04`, cat:`Physical Sciences`, title:`The Solar System Basics`, diff:`Easy`,
    qs:[
      { q:`Which planet is closest to the Sun?`, ch:[`Venus`,`Mercury`,`Earth`,`Mars`], ans:1, exp:`Mercury is the closest planet to the Sun, followed by Venus, Earth, and Mars. Being closest means it has the shortest orbital path and year.` },
      { q:`Which of these planets is classified as a "gas giant"?`, ch:[`Mars`,`Earth`,`Jupiter`,`Mercury`], ans:2, exp:`Jupiter, along with Saturn, Uranus, and Neptune, is a gas giant made mostly of hydrogen and helium, unlike the smaller rocky terrestrial planets like Mars and Earth.` },
      { q:`The asteroid belt is located between the orbits of:`, ch:[`Earth and Mars`,`Jupiter and Saturn`,`Neptune and Pluto`,`Mars and Jupiter`], ans:3, exp:`The main asteroid belt lies between Mars and Jupiter, containing countless rocky bodies left over from the early solar system.` },
      { q:`The Sun is best classified as a:`, ch:[`Star`,`Moon`,`Planet`,`Comet`], ans:0, exp:`The Sun is a star, a giant ball of hot gas that produces its own light and heat through nuclear fusion in its core.` },
      { q:`Which of these is considered a dwarf planet rather than one of the eight main planets?`, ch:[`Neptune`,`Uranus`,`Pluto`,`Saturn`], ans:2, exp:`Pluto was reclassified as a dwarf planet in 2006 because, unlike the eight main planets, it has not cleared other objects out of its orbital path.` },
    ]
  },
  {
    id:`pb05`, cat:`Physical Sciences`, title:`Moon Phases & Eclipses Basics`, diff:`Medium`,
    qs:[
      { q:`The changing phases of the Moon are caused mainly by:`, ch:[`Earth's shadow covering the Moon`,`Changes in the Moon's distance from Earth`,`The changing angle from which we view the Moon's sunlit half`,`The Moon spinning faster or slower`], ans:2, exp:`The Moon always has one half lit by the Sun, but as it orbits Earth, we see different amounts of that sunlit half, creating the phases from new moon to full moon and back.` },
      { q:`A solar eclipse occurs when:`, ch:[`Earth passes between the Sun and the Moon`,`The Moon passes between the Sun and Earth, blocking sunlight`,`The Moon is completely full`,`The Sun passes behind Earth`], ans:1, exp:`During a solar eclipse, the new Moon lines up directly between the Sun and Earth, casting a shadow on part of Earth's surface and briefly blocking the Sun.` },
      { q:`A lunar eclipse can only happen during which Moon phase?`, ch:[`Full moon`,`New moon`,`First quarter`,`Last quarter`], ans:0, exp:`A lunar eclipse happens when Earth passes between the Sun and Moon, which can only occur when the Moon is full and directly opposite the Sun in the sky.` },
      { q:`We do not get a solar and lunar eclipse every single month mainly because:`, ch:[`The Moon's orbit is tilted slightly relative to Earth's orbit around the Sun`,`The Moon moves too fast`,`Earth's axis is tilted`,`The Sun's light is too bright to allow it`], ans:0, exp:`The Moon's orbital path is tilted about 5 degrees relative to Earth's path around the Sun, so most months the Moon passes slightly above or below the line needed for an eclipse.` },
      { q:`During a total lunar eclipse, the Moon often appears reddish because:`, ch:[`The Moon is briefly on fire`,`The Moon reflects red light from Mars`,`Earth blocks all light from reaching the Moon`,`Sunlight is bent and filtered through Earth's atmosphere onto the Moon`], ans:3, exp:`Earth's atmosphere scatters blue light but bends red light toward the Moon, giving a total lunar eclipse its famous reddish "blood moon" glow.` },
    ]
  },
  {
    id:`pb06`, cat:`Physical Sciences`, title:`Stars & the Life Cycle of Stars Basics`, diff:`Medium`,
    qs:[
      { q:`Stars produce their energy mainly through:`, ch:[`Chemical burning of gas`,`Nuclear fission of uranium`,`Gravitational collapse alone`,`Nuclear fusion of hydrogen into helium`], ans:3, exp:`In a star's core, extreme heat and pressure fuse hydrogen atoms into helium, releasing enormous amounts of energy that make the star shine.` },
      { q:`Our Sun is currently in which stage of its life?`, ch:[`Red giant`,`White dwarf`,`Main sequence`,`Supernova`], ans:2, exp:`The Sun is a main sequence star, meaning it is steadily fusing hydrogen into helium in its core, a stable stage that will last billions of years.` },
      { q:`A star is born from a collapsing cloud of gas and dust called a:`, ch:[`Nebula`,`Black hole`,`Asteroid`,`Comet`], ans:0, exp:`Nebulae are giant clouds of gas and dust in space. Gravity can pull material within a nebula together until it becomes dense and hot enough to ignite as a new star.` },
      { q:`What is the single biggest factor that determines how a star will eventually die?`, ch:[`Its color`,`Its distance from Earth`,`Its temperature at birth only`,`Its mass`], ans:3, exp:`A star's mass determines its fate: low-mass stars like our Sun end as white dwarfs, while very massive stars explode as supernovae and can leave behind neutron stars or black holes.` },
      { q:`A very massive star is likely to end its life as a:`, ch:[`Chemical burning of gas`,`Small rocky planet`,`Supernova, possibly leaving behind a neutron star or black hole`,`A comet`], ans:2, exp:`When a massive star runs out of fuel, its core collapses suddenly and the outer layers explode outward in a supernova, sometimes leaving an ultra-dense neutron star or a black hole behind.` },
    ]
  },
  {
    id:`pb07`, cat:`Physical Sciences`, title:`Earth's Layers & Plate Tectonics Basics`, diff:`Medium`,
    qs:[
      { q:`From the surface inward, Earth's main layers are ordered:`, ch:[`Core, mantle, crust`,`Mantle, crust, core`,`Core, crust, mantle`,`Crust, mantle, core`], ans:3, exp:`Earth is layered like an onion: a thin outer crust, a thick mantle beneath it, and a core (outer and inner) at the very center.` },
      { q:`Earth's outer core is made of:`, ch:[`Solid rock`,`Liquid metal, mostly iron and nickel`,`Compressed gas`,`Ice`], ans:1, exp:`The outer core is molten metal, mostly iron and nickel, that flows slowly and helps generate Earth's magnetic field. The inner core, despite being even hotter, is solid due to immense pressure.` },
      { q:`Tectonic plates float and slowly move on top of a soft, flowing layer called the:`, ch:[`Inner core`,`Outer core`,`Asthenosphere (a partly molten layer of the upper mantle)`,`Ionosphere`], ans:2, exp:`The rigid lithosphere, which includes the crust and uppermost mantle, is broken into plates that slide slowly over the soft, partly molten asthenosphere below.` },
      { q:`At a divergent plate boundary, tectonic plates:`, ch:[`Move apart from each other`,`Move toward each other`,`Slide past each other sideways`,`Stop moving completely`], ans:0, exp:`At divergent boundaries, plates pull apart, often letting magma rise up to form new crust, as happens along the Mid-Atlantic Ridge on the ocean floor.` },
      { q:`Earthquakes most commonly occur:`, ch:[`In the exact middle of tectonic plates`,`Only underwater`,`Only in the atmosphere`,`Along faults at plate boundaries`], ans:3, exp:`Most earthquakes happen along faults where tectonic plates meet, grind, or slip past one another, releasing built-up stress as seismic waves.` },
    ]
  },
  {
    id:`pb08`, cat:`Physical Sciences`, title:`The Rock Cycle & Minerals Basics`, diff:`Easy`,
    qs:[
      { q:`Igneous rocks form when:`, ch:[`Sediments are compacted and cemented together`,`Molten rock (magma or lava) cools and solidifies`,`Existing rock is changed by heat and pressure`,`Minerals dissolve completely in water`], ans:1, exp:`Igneous rocks, like granite and basalt, crystallize as molten magma or lava cools and hardens, either underground or after erupting from a volcano.` },
      { q:`Sedimentary rocks are the type of rock most likely to contain:`, ch:[`Fossils`,`Volcanic glass`,`Only metallic minerals`,`Nothing but pure crystals`], ans:0, exp:`Sedimentary rocks form as layers of sediment, sand, and organic material are compacted and cemented together over time, which is also how fossils commonly get preserved.` },
      { q:`Metamorphic rocks form through the process of:`, ch:[`Cooling of lava`,`Erosion alone`,`Evaporation of seawater`,`Heat and pressure transforming an existing rock`], ans:3, exp:`Metamorphic rocks, like marble and slate, form when intense heat and pressure change the structure of an existing rock without fully melting it.` },
      { q:`Which of these is NOT one of the defining characteristics of a mineral?`, ch:[`Naturally occurring`,`Has a definite chemical composition`,`Made by living organisms`,`Has a crystalline structure`], ans:2, exp:`True minerals are naturally occurring, inorganic, solid substances with a definite chemical composition and an orderly crystal structure; being produced by living organisms disqualifies a substance from being a true mineral.` },
      { q:`The rock cycle illustrates that rocks:`, ch:[`Can change from one type to another over very long periods of time`,`Never change once they are formed`,`Only form inside volcanoes`,`Are all exactly the same age`], ans:0, exp:`Over millions of years, heat, pressure, weathering, and erosion can transform igneous, sedimentary, and metamorphic rocks into one another, a process called the rock cycle.` },
    ]
  },
  {
    id:`pb09`, cat:`Physical Sciences`, title:`Weather Patterns & Instruments Basics`, diff:`Easy`,
    qs:[
      { q:`A barometer is an instrument used to measure:`, ch:[`Wind speed`,`Air pressure`,`Humidity`,`Temperature`], ans:1, exp:`A barometer measures atmospheric (air) pressure, which is one of the most important clues meteorologists use to predict upcoming weather.` },
      { q:`An anemometer is used to measure:`, ch:[`Wind speed`,`Rainfall amount`,`Cloud height`,`Air pressure`], ans:0, exp:`An anemometer usually has spinning cups that catch the wind, letting it measure how fast the wind is blowing.` },
      { q:`A hygrometer measures:`, ch:[`Temperature`,`Air pressure`,`Humidity, or moisture in the air`,`Wind direction`], ans:2, exp:`A hygrometer measures relative humidity, meaning how much water vapor is in the air compared to the maximum it could hold at that temperature.` },
      { q:`A cold front typically brings:`, ch:[`A long period of gentle rain followed by clearing skies`,`No change in weather at all`,`Only clear, sunny skies`,`Sudden, often intense storms as it pushes warm air upward quickly`], ans:3, exp:`Cold fronts move fast and shove warm air abruptly upward, which can create quick, sometimes intense thunderstorms before the air clears and cools behind the front.` },
      { q:`Low pressure weather systems are generally associated with:`, ch:[`Stormy or unsettled weather`,`Clear, calm weather`,`No wind at all`,`Extremely cold temperatures always`], ans:0, exp:`In low pressure areas, air rises and cools, often forming clouds and precipitation, which is why low pressure systems are linked to storms and unsettled weather.` },
    ]
  },
  {
    id:`pb10`, cat:`Physical Sciences`, title:`Renewable vs Nonrenewable Energy Basics`, diff:`Easy`,
    qs:[
      { q:`Which of these is a renewable energy source?`, ch:[`Solar power`,`Coal`,`Natural gas`,`Oil`], ans:0, exp:`Solar power is renewable because sunlight is continuously available and will not run out on a human timescale, unlike fossil fuels.` },
      { q:`Fossil fuels like coal and oil are considered nonrenewable mainly because:`, ch:[`They are too expensive to use`,`They produce no usable energy`,`They are found only underwater`,`They take millions of years to form and are used far faster than they form`], ans:3, exp:`Coal, oil, and natural gas formed from ancient organic material over millions of years, so once used up, they cannot be replaced within a human lifetime.` },
      { q:`Which of these is NOT typically classified as a renewable energy source?`, ch:[`Wind`,`Natural gas`,`Hydropower (moving water)`,`Geothermal energy`], ans:1, exp:`Natural gas is a fossil fuel formed over millions of years, making it nonrenewable, unlike wind, hydropower, and geothermal energy, which are naturally replenished.` },
      { q:`Solar panels generate electricity by:`, ch:[`Converting sunlight directly into electricity`,`Burning sunlight as fuel`,`Storing wind energy`,`Only heating water to spin turbines`], ans:0, exp:`Solar panels use photovoltaic cells that convert sunlight directly into an electric current, without needing to burn any fuel.` },
      { q:`A major advantage of renewable energy sources is that they:`, ch:[`Never require any technology to use`,`Always cost nothing to build`,`Can be replenished naturally within a human lifetime`,`Produce more pollution than fossil fuels`], ans:2, exp:`Renewable resources like sunlight, wind, and moving water are naturally replenished quickly, so they will not run out the way fossil fuels eventually will.` },
    ]
  },
  {
    id:`pb11`, cat:`Physical Sciences`, title:`Measurement, Sig Figs & Scientific Notation Basics`, diff:`Medium`,
    qs:[
      { q:`How many significant figures are in the measurement 0.00450 g?`, ch:[`2`,`6`,`3`,`5`], ans:2, exp:`Leading zeros are never significant, but the 4, 5, and the trailing zero after the decimal point all count, giving 3 significant figures.` },
      { q:`Scientific notation expresses a number as:`, ch:[`A fraction only`,`Any number divided by 100`,`A number with no decimal point`,`A number between 1 and 10 multiplied by a power of 10`], ans:3, exp:`Scientific notation writes numbers as a coefficient between 1 and 10 times 10 raised to a power, which makes very large or very small numbers easier to work with.` },
      { q:`Which of these numbers is correctly written in proper scientific notation?`, ch:[`45 x 10^3`,`4.5 x 10^4`,`0.45 x 10^5`,`450 x 10^2`], ans:1, exp:`Proper scientific notation requires a coefficient between 1 and 10, so 4.5 x 10^4 is correctly formatted, even though the other options equal the same value.` },
      { q:`Accuracy refers to how close a measurement is to:`, ch:[`Other measurements in the same set`,`The true or accepted value`,`Zero`,`The price of the measuring tool`], ans:1, exp:`Accuracy describes how close your measured value is to the actual, true value, which is different from precision.` },
      { q:`Precision refers to:`, ch:[`How close repeated measurements are to each other`,`How expensive the instrument is`,`How close a measurement is to the true value`,`The color of the measuring device`], ans:0, exp:`Precision describes how consistent or reproducible a set of measurements are with one another, regardless of whether they are close to the true value.` },
    ]
  },
  {
    id:`pb12`, cat:`Physical Sciences`, title:`Unit Conversion & Dimensional Analysis Basics`, diff:`Medium`,
    qs:[
      { q:`How many meters are in 5 kilometers?`, ch:[`50 m`,`500 m`,`50,000 m`,`5,000 m`], ans:3, exp:`Since 1 kilometer equals 1,000 meters, 5 kilometers equals 5 x 1,000 = 5,000 meters.` },
      { q:`Dimensional analysis is a method used to:`, ch:[`Guess an answer without using units`,`Convert between units by multiplying by conversion factors that equal 1`,`Avoid using units in calculations`,`Measure mass directly without a scale`], ans:1, exp:`Dimensional analysis uses conversion factors, ratios that equal one, like 1000 m / 1 km, to cancel out unwanted units and convert a measurement into different units.` },
      { q:`How many centimeters are in 2.5 meters?`, ch:[`25 cm`,`250 cm`,`2,500 cm`,`0.25 cm`], ans:1, exp:`Since 1 meter equals 100 centimeters, 2.5 meters equals 2.5 x 100 = 250 centimeters.` },
      { q:`The metric prefix "milli-" means:`, ch:[`One thousand times larger`,`One hundred times larger`,`One thousandth (1/1000)`,`One hundredth (1/100)`], ans:2, exp:`The prefix milli- means one thousandth of a base unit, so a milliliter is 1/1000 of a liter and a millimeter is 1/1000 of a meter.` },
      { q:`When converting units using a conversion factor, you should set it up so that:`, ch:[`The unwanted unit cancels out, leaving only the desired unit`,`Both units cancel out completely`,`No units are included in the calculation at all`,`The numbers always get bigger`], ans:0, exp:`A properly set up conversion factor places the unwanted unit so it cancels with the unit in your original measurement, leaving you with the unit you want.` },
    ]
  },
  {
    id:`pb13`, cat:`Physical Sciences`, title:`Chemical Safety & Lab Techniques Basics`, diff:`Easy`,
    qs:[
      { q:`Before starting any lab experiment, you should always:`, ch:[`Taste the chemicals to help identify them`,`Skip the instructions to save time`,`Read the safety instructions and wear appropriate protective equipment`,`Mix chemicals randomly to see what happens`], ans:2, exp:`Reading safety instructions and wearing protective gear like goggles before you begin is the single most important habit for staying safe in any lab.` },
      { q:`If you need to check the smell of a chemical in the lab, the safe technique is to:`, ch:[`Waft the vapor gently toward your nose with your hand`,`Put your nose directly over the container`,`Take a deep breath right above the container`,`Never determine odor under any circumstance in any class`], ans:0, exp:`Wafting means gently fanning vapors toward your nose from a distance instead of inhaling directly, which limits your exposure to potentially harmful fumes.` },
      { q:`When diluting a concentrated acid with water, you should always:`, ch:[`Add water to the acid`,`Add the acid slowly to the water`,`Mix them at the same time from opposite sides`,`Heat them together first`], ans:1, exp:`Adding acid slowly to water, rather than the reverse, helps prevent dangerous, sudden boiling and splattering caused by the heat released during dilution.` },
      { q:`A Safety Data Sheet (SDS) provides information about a chemical's:`, ch:[`Hazards, handling, and storage requirements`,`Retail price`,`Taste`,`Age`], ans:0, exp:`An SDS lists important safety information for a chemical, including its hazards, proper handling procedures, storage guidelines, and what to do in an emergency.` },
      { q:`If a chemical spills on your skin during a lab, you should:`, ch:[`Ignore it if it does not hurt`,`Cover it with a bandage right away`,`Wait to see if a reaction happens`,`Rinse the area with plenty of water immediately and tell your teacher`], ans:3, exp:`Flushing the affected skin with plenty of water right away and alerting your teacher helps limit chemical exposure and gets you help quickly if needed.` },
    ]
  },
  {
    id:`pb14`, cat:`Physical Sciences`, title:`States of Matter & Phase Changes Basics`, diff:`Easy`,
    qs:[
      { q:`In a solid, the particles are:`, ch:[`Far apart and moving freely`,`Completely stationary with no energy`,`Spread out and ionized`,`Tightly packed and vibrating in fixed positions`], ans:3, exp:`In a solid, particles are packed closely together in a fixed arrangement and can only vibrate in place, which is why solids hold their shape.` },
      { q:`The change from a liquid to a gas is called:`, ch:[`Condensation`,`Evaporation (or boiling)`,`Freezing`,`Sublimation`], ans:1, exp:`Evaporation or boiling describes a liquid gaining enough energy for its particles to break free and become a gas.` },
      { q:`Sublimation is the process where a substance changes directly from:`, ch:[`Solid to gas, without becoming a liquid`,`Liquid to gas`,`Gas to solid`,`Liquid to solid`], ans:0, exp:`Sublimation skips the liquid phase entirely, going straight from solid to gas, as seen with dry ice (solid carbon dioxide) turning into a smoky vapor.` },
      { q:`At sea level, pure water freezes at approximately:`, ch:[`0 degrees C (32 degrees F)`,`100 degrees C (212 degrees F)`,`-40 degrees C`,`50 degrees C`], ans:0, exp:`Pure water freezes at 0 degrees Celsius (32 degrees Fahrenheit) at standard atmospheric pressure.` },
      { q:`When a gas condenses into a liquid, the particles:`, ch:[`Gain energy and spread out further`,`Stay exactly the same`,`Lose energy and move closer together`,`Turn into a solid immediately`], ans:2, exp:`Condensation happens as a gas loses energy, usually by cooling, causing its particles to slow down and pack closer together into a liquid.` },
    ]
  },
  {
    id:`pb15`, cat:`Physical Sciences`, title:`Isotopes & Radiation Safety Basics`, diff:`Medium`,
    qs:[
      { q:`Isotopes of the same element have the same number of ______ but different numbers of ______.`, ch:[`Protons; neutrons`,`Neutrons; protons`,`Electrons; protons`,`Protons; electrons`], ans:0, exp:`Isotopes are versions of the same element that always share the same number of protons, since that defines the element, but they differ in their number of neutrons.` },
      { q:`The atomic number of an element tells you the number of:`, ch:[`Neutrons in the nucleus`,`Electrons in the outer shell only`,`Total mass of the atom`,`Protons in the nucleus`], ans:3, exp:`The atomic number equals the number of protons in an atom's nucleus, and it is what determines which element the atom is.` },
      { q:`A radioactive isotope's half-life is the time it takes for:`, ch:[`All of the radioactive atoms in a sample to decay`,`Half of the radioactive atoms in a sample to decay`,`The isotope to double in mass`,`The isotope to become stable instantly`], ans:1, exp:`Half-life is the time required for half of the radioactive atoms in a given sample to decay into a different, often more stable, form.` },
      { q:`Which type of radiation can typically be stopped by just a sheet of paper?`, ch:[`Gamma radiation`,`Beta radiation`,`Alpha radiation`,`X-rays`], ans:2, exp:`Alpha particles are relatively large and slow, so they can be blocked by something as thin as a sheet of paper or the outer layer of skin.` },
      { q:`The three basic principles of radiation safety are often summarized as:`, ch:[`Time, distance, and shielding`,`Speed, weight, color`,`Heat, pressure, volume`,`Mass, energy, momentum`], ans:0, exp:`Limiting your exposure time near a radioactive source, increasing your distance from it, and using shielding material are the three key strategies for staying safe around radiation.` },
    ]
  },
  {
    id:`pb16`, cat:`Physical Sciences`, title:`Sound Waves & the Doppler Effect Basics`, diff:`Medium`,
    qs:[
      { q:`Sound waves are classified as:`, ch:[`Longitudinal waves`,`Transverse waves`,`Electromagnetic waves`,`Standing waves only`], ans:0, exp:`Sound waves are longitudinal waves, meaning the particles of the medium vibrate back and forth in the same direction the wave travels.` },
      { q:`Unlike light, sound cannot travel through:`, ch:[`Air`,`Water`,`A vacuum (empty space)`,`Steel`], ans:2, exp:`Sound needs a medium, like air, water, or a solid, to travel because it moves by vibrating particles. In a vacuum there are no particles to vibrate, so sound cannot travel.` },
      { q:`The pitch of a sound is determined mainly by its:`, ch:[`Amplitude`,`Frequency`,`Speed`,`Color`], ans:1, exp:`Frequency, or how many wave cycles occur per second, determines pitch: higher frequency sounds are perceived as higher pitched.` },
      { q:`Sound generally travels fastest through:`, ch:[`A vacuum`,`Air`,`Water`,`Solids (like steel)`], ans:3, exp:`Sound travels fastest through solids because their particles are packed tightly together, allowing vibrations to pass from particle to particle more quickly than in liquids or gases.` },
      { q:`The Doppler effect explains why a siren sounds higher in pitch as an ambulance:`, ch:[`Moves away from you`,`Stops completely`,`Moves toward you`,`Turns off`], ans:2, exp:`As a sound source moves toward you, sound waves get compressed closer together in front of it, raising the frequency and making the pitch sound higher.` },
    ]
  },
  {
    id:`pb17`, cat:`Physical Sciences`, title:`Light, Color & the EM Spectrum Basics`, diff:`Easy`,
    qs:[
      { q:`Which list correctly orders the electromagnetic spectrum from lowest to highest energy?`, ch:[`Gamma rays, X-rays, UV, visible, infrared, microwaves, radio`,`Radio, microwaves, infrared, visible, UV, X-rays, gamma rays`,`Visible, UV, X-rays, radio, gamma rays, infrared, microwaves`,`X-rays, gamma rays, radio, visible, UV, infrared, microwaves`], ans:1, exp:`The electromagnetic spectrum runs from low-energy, long-wavelength radio waves up through microwaves, infrared, visible light, ultraviolet, X-rays, and finally high-energy gamma rays.` },
      { q:`Of all visible light, which color has the longest wavelength?`, ch:[`Violet`,`Blue`,`Green`,`Red`], ans:3, exp:`In the visible spectrum, red light has the longest wavelength and lowest frequency, while violet light has the shortest wavelength and highest frequency.` },
      { q:`An object appears green to your eyes because it:`, ch:[`Absorbs all colors of light`,`Emits its own green light`,`Reflects green light and absorbs most other colors`,`Has no interaction with light at all`], ans:2, exp:`Most everyday objects do not produce their own light. They appear a certain color because they reflect that wavelength of light while absorbing the others.` },
      { q:`The primary colors of light used in screens like TVs and phones are:`, ch:[`Red, green, blue`,`Red, yellow, blue`,`Cyan, magenta, yellow`,`Black, white, gray`], ans:0, exp:`Screens create color using red, green, and blue light (RGB), combining them in different intensities to produce the full range of colors you see.` },
      { q:`Ultraviolet (UV) radiation from the sun is mainly responsible for:`, ch:[`Sunburns and skin damage`,`Making objects look red`,`Cooling the atmosphere`,`Producing radio signals`], ans:0, exp:`UV radiation carries more energy than visible light and can damage skin cells, which is why sunscreen and UV protection are important.` },
    ]
  },
  {
    id:`pb18`, cat:`Physical Sciences`, title:`Chemistry of Everyday Household Products Basics`, diff:`Easy`,
    qs:[
      { q:`On the pH scale, which ranges from 0 to 14, a pH of 7 is considered:`, ch:[`Neutral`,`Strongly acidic`,`Strongly basic`,`Radioactive`], ans:0, exp:`A pH of 7, like pure water, is considered neutral, meaning it is neither acidic nor basic. Values below 7 are acidic, and values above 7 are basic.` },
      { q:`Vinegar is a common example of a household:`, ch:[`Base`,`Salt`,`Acid`,`Metal`], ans:2, exp:`Vinegar contains acetic acid, giving it a low pH and sour taste, which makes it a mild household acid.` },
      { q:`Baking soda (sodium bicarbonate) is best described as a mild:`, ch:[`Acid`,`Base`,`Solvent`,`Metal`], ans:1, exp:`Baking soda has a pH above 7, making it a mild base, which is why it can help neutralize acids like the ones in an upset stomach.` },
      { q:`Mixing bleach and ammonia-based cleaners is dangerous because it can produce:`, ch:[`A pleasant fragrance`,`Pure oxygen`,`Table salt`,`Harmful, toxic fumes`], ans:3, exp:`Combining bleach and ammonia creates toxic gases called chloramines, which can cause serious respiratory harm, so these products should never be mixed.` },
      { q:`Soap helps clean grease and oil off dishes because soap molecules:`, ch:[`Have one end that attracts water and one end that attracts grease or oil`,`Repel water completely`,`Dissolve only in oil`,`Are always acidic`], ans:0, exp:`Soap molecules have a water-loving end and a grease-loving end, which lets them surround grease particles and lift them away so water can rinse them off.` },
    ]
  },
{
    id:`pb19`, cat:`Physical Sciences`, title:`Basic Organic Molecules in Living Things`, diff:`Easy`,
    qs:[
      { q:`What are the four major classes of organic molecules that make up living things?`, ch:[`Carbohydrates, lipids, proteins, and nucleic acids`,`Rocks, minerals, salts, and metals`,`Oxygen, nitrogen, carbon, and hydrogen`,`Water, salt, sugar, and oil`], ans:0, exp:`Living things are built from four main types of organic (carbon-based) molecules: carbohydrates, lipids, proteins, and nucleic acids. Each plays a different role in cells.` },
      { q:`Amino acids are the building blocks (monomers) of which organic molecule?`, ch:[`Carbohydrates`,`Lipids`,`Proteins`,`Nucleic acids`], ans:2, exp:`Proteins are made of long chains of amino acids linked together. Different combinations and orders of amino acids create the huge variety of proteins in the body, like enzymes and muscle fibers.` },
      { q:`Which organic molecule is the body's main quick energy source and includes sugars like glucose?`, ch:[`Carbohydrates`,`Lipids`,`Proteins`,`Nucleic acids`], ans:0, exp:`Carbohydrates, including simple sugars like glucose, are broken down quickly to release energy for cells to use, which is why athletes often eat carb-rich foods before exercise.` },
      { q:`DNA and RNA belong to which class of organic molecules, and what is their main job?`, ch:[`Lipids; they store energy`,`Nucleic acids; they store and transmit genetic information`,`Proteins; they speed up chemical reactions`,`Carbohydrates; they build cell membranes`], ans:1, exp:`DNA and RNA are nucleic acids, made of repeating units called nucleotides. Their job is to store, copy, and transmit the genetic instructions that tell cells how to build proteins.` },
      { q:`Why are lipids like fats and oils good for long-term energy storage and building cell membranes?`, ch:[`They dissolve easily in water`,`They are made of only nitrogen atoms`,`They are non-polar and pack a lot of energy into a small space`,`They are the shortest organic molecules`], ans:2, exp:`Lipids do not mix well with water (they are hydrophobic) and store more energy per gram than carbohydrates, making them efficient for long-term storage and for forming the flexible, water-repelling membranes around cells.` },
    ]
  },
  {
    id:`pb20`, cat:`Physical Sciences`, title:`Space Exploration Basics`, diff:`Easy`,
    qs:[
      { q:`Who became the first human to travel into space, in 1961?`, ch:[`Neil Armstrong`,`Yuri Gagarin`,`John Glenn`,`Buzz Aldrin`], ans:1, exp:`Soviet cosmonaut Yuri Gagarin orbited Earth once aboard Vostok 1 in April 1961, becoming the first human in space.` },
      { q:`In 1969, which NASA mission first landed astronauts on the Moon?`, ch:[`Apollo 8`,`Gemini 4`,`Apollo 11`,`Apollo 13`], ans:2, exp:`Apollo 11 landed Neil Armstrong and Buzz Aldrin on the Moon in July 1969, while Michael Collins orbited above in the command module.` },
      { q:`What is a satellite?`, ch:[`A star that has burned out`,`Any object that orbits a larger object in space`,`A type of rocket fuel`,`A telescope located on Earth's surface`], ans:1, exp:`A satellite is any object, natural or human-made, that orbits a larger body due to gravity. The Moon is a natural satellite of Earth, and thousands of artificial satellites also orbit our planet.` },
      { q:`The International Space Station (ISS) orbits Earth mainly so astronauts can do what?`, ch:[`Mine asteroids for metals`,`Conduct research in microgravity that can't easily be done on Earth`,`Refuel passing rockets`,`Broadcast television signals only`], ans:1, exp:`The ISS is a orbiting laboratory where astronauts study how the human body, plants, and materials behave in microgravity, research that helps both space travel and medicine on Earth.` },
      { q:`Why do space agencies send robotic rovers, like those exploring Mars, instead of only sending humans?`, ch:[`Rovers are cheaper and can survive harsh conditions without life support, letting us explore before risking astronauts`,`Rovers can think creatively better than humans`,`Robots do not need any kind of mission plan`,`Robotic rovers do not need power to keep operating`], ans:0, exp:`Sending humans requires food, water, air, and a safe return trip, which is expensive and risky. Rovers can survive extreme temperatures and radiation while collecting valuable data first.` },
    ]
  },
  {
    id:`pb21`, cat:`Physical Sciences`, title:`Metric System & SI Units Basics`, diff:`Easy`,
    qs:[
      { q:`What is the SI (metric) base unit for measuring length?`, ch:[`Foot`,`Meter`,`Inch`,`Yard`], ans:1, exp:`The meter is the SI base unit of length. Scientists worldwide use it, along with prefixes like kilo- and centi-, to describe distances big and small.` },
      { q:`How many meters are in 3.5 kilometers?`, ch:[`35 m`,`350 m`,`3,500 m`,`35,000 m`], ans:2, exp:`The prefix kilo- means 1,000, so 3.5 km equals 3.5 x 1,000 = 3,500 meters.` },
      { q:`What is the SI base unit for mass?`, ch:[`Pound`,`Gram`,`Kilogram`,`Ounce`], ans:2, exp:`The kilogram is the official SI base unit for mass, even though grams are often used for smaller everyday measurements like a dose of medicine.` },
      { q:`The metric prefix milli- means the base unit is divided by what number?`, ch:[`10`,`100`,`1,000`,`1,000,000`], ans:2, exp:`Milli- means one-thousandth, so a milliliter is 1/1,000 of a liter and a milligram is 1/1,000 of a gram, a scale often used for medication dosages.` },
      { q:`Which SI unit is used to measure temperature in science, and what is water's freezing point in that unit?`, ch:[`Fahrenheit; 32 degrees`,`Celsius; 100 degrees`,`Kelvin; 273.15`,`Kelvin; 0`], ans:2, exp:`Scientists use the Kelvin scale, where 0 K is absolute zero. Water freezes at 273.15 K, which corresponds to 0 degrees Celsius.` },
    ]
  },
  {
    id:`pb22`, cat:`Physical Sciences`, title:`Density & Specific Gravity in Medicine Basics`, diff:`Medium`,
    qs:[
      { q:`Density is calculated using which formula?`, ch:[`mass x volume`,`mass / volume`,`volume / mass`,`mass + volume`], ans:1, exp:`Density equals mass divided by volume (D = m/V), telling you how much matter is packed into a given amount of space.` },
      { q:`Specific gravity compares the density of a substance to the density of what reference substance?`, ch:[`Air`,`Mercury`,`Water`,`Blood`], ans:2, exp:`Specific gravity is a ratio of a substance's density to the density of water (about 1 g/mL). A specific gravity greater than 1 means it is denser than water.` },
      { q:`A urine specific gravity test is commonly used in medicine to check what?`, ch:[`Blood sugar levels`,`How concentrated or dilute a patient's urine is (hydration status)`,`Cholesterol levels`,`Oxygen levels in the blood`], ans:1, exp:`Very concentrated urine (higher specific gravity) can signal dehydration, while very dilute urine (lower specific gravity) can signal overhydration or certain kidney issues.` },
      { q:`Why does body fat tend to float in water while bone and muscle tend to sink?`, ch:[`Fat is less dense than water, while bone and muscle are denser than water`,`Fat contains more water than bone does`,`Bone has essentially no mass`,`Muscle is lighter than air`], ans:0, exp:`Fat tissue has a lower density than water, so it floats, while denser tissues like bone and muscle sink. This principle is even used in some body composition measurement methods.` },
      { q:`If a 50 mL sample of a liquid has a mass of 55 grams, what is its density?`, ch:[`0.9 g/mL`,`1.0 g/mL`,`1.1 g/mL`,`2,750 g/mL`], ans:2, exp:`Density = mass / volume = 55 g / 50 mL = 1.1 g/mL, which is slightly denser than pure water.` },
    ]
  },
  {
    id:`pb23`, cat:`Physical Sciences`, title:`Basic Trigonometry Applications in Science`, diff:`Medium`,
    qs:[
      { q:`In a right triangle, which ratio is defined as opposite over hypotenuse?`, ch:[`Cosine`,`Sine`,`Tangent`,`Secant`], ans:1, exp:`Sine of an angle equals the length of the side opposite that angle divided by the hypotenuse. This is part of the SOHCAHTOA rule used to solve right triangles.` },
      { q:`A tree casts a shadow 12 meters long, and the angle of elevation from the tip of the shadow to the top of the tree is 40 degrees. Which trig ratio would you use to find the tree's height?`, ch:[`Sine`,`Cosine`,`Tangent`,`Pythagorean theorem only`], ans:2, exp:`Tangent relates the opposite side (height) to the adjacent side (shadow length): tan(40) = height / 12. Solving gives the tree's height without needing to know the hypotenuse.` },
      { q:`A lab ladder leans against a wall, making a 60 degree angle with the ground, with its base 2 meters from the wall. Which equation finds the height (h) it reaches on the wall?`, ch:[`h = 2 x tan(60)`,`h = 2 / tan(60)`,`h = 2 x sin(60)`,`h = tan(60) / 2`], ans:0, exp:`Since tangent equals opposite/adjacent, tan(60) = h / 2, so rearranging gives h = 2 x tan(60), which comes out to roughly 3.5 meters.` },
      { q:`The angle of elevation is the angle measured from what reference line up to an object, like the sun or a plane?`, ch:[`A vertical wall`,`A horizontal line, such as the ground`,`The hypotenuse`,`The object's shadow`], ans:1, exp:`The angle of elevation is always measured upward from a horizontal line of sight, such as the ground, to the object being observed.` },
      { q:`In a right triangle with a 30 degree angle and a hypotenuse of 10 cm, which ratio would you use to directly find the side opposite the 30 degree angle?`, ch:[`Sine = opposite/hypotenuse`,`Cosine = adjacent/hypotenuse`,`Tangent = opposite/adjacent`,`None of these can be used`], ans:0, exp:`Since you know the hypotenuse and want the opposite side, sine is the right tool: sin(30) = opposite / 10, so opposite = 10 x sin(30) = 5 cm.` },
    ]
  },
  {
    id:`pb24`, cat:`Physical Sciences`, title:`Probability in Genetics & Medicine Basics`, diff:`Medium`,
    qs:[
      { q:`In a Punnett square cross between two heterozygous parents (Aa x Aa), what fraction of offspring are predicted to show the recessive trait?`, ch:[`1/4`,`1/2`,`3/4`,`All of them`], ans:0, exp:`Crossing Aa x Aa gives genotype combinations AA, Aa, Aa, and aa. Only the aa combination (1 out of 4) shows the recessive trait, so the probability is 1/4, or 25 percent.` },
      { q:`If both parents are carriers (Aa) for a recessive genetic disorder, what is the probability their child will be born unaffected (not show the disorder)?`, ch:[`25%`,`50%`,`75%`,`100%`], ans:2, exp:`Three of the four possible genotype combinations (AA, Aa, Aa) do not show the disorder, only aa does. That means there is a 75% chance the child will be unaffected.` },
      { q:`Flipping a coin is often used to model genetics probability because each gamete a parent passes on is like a coin flip. If a parent is Aa, what is the probability a specific gamete carries the A allele?`, ch:[`25%`,`50%`,`75%`,`0%`], ans:1, exp:`A heterozygous parent (Aa) has one A allele and one a allele, so each gamete has an equal, independent 50% chance of carrying either one.` },
      { q:`A couple has already had 3 children, all girls. What is the probability their 4th child will also be a girl?`, ch:[`Less than 50%, because they are due for a boy`,`Exactly 50%, because each pregnancy is an independent event`,`75%`,`0%`], ans:1, exp:`Each pregnancy is an independent event, meaning past outcomes do not affect future ones. The probability of a girl stays at about 50% every time, regardless of previous births.` },
      { q:`Two independent recessive genetic tests each have a 1/4 chance of showing a certain trait. What is the probability a child shows BOTH traits?`, ch:[`1/4`,`1/2`,`1/8`,`1/16`], ans:3, exp:`For independent events, you multiply their individual probabilities: 1/4 x 1/4 = 1/16. This is why having multiple rare recessive traits together is much less likely than having just one.` },
    ]
  },
  {
    id:`pb25`, cat:`Physical Sciences`, title:`Reading Graphs & Data in Science Basics`, diff:`Easy`,
    qs:[
      { q:`On a properly set-up line graph, which variable, the one the scientist deliberately changes, is normally placed on the x-axis?`, ch:[`Dependent variable`,`Independent variable`,`Control variable`,`Constant`], ans:1, exp:`The independent variable, the factor a scientist changes on purpose (like time or dosage), goes on the x-axis, while the dependent variable, what is measured in response, goes on the y-axis.` },
      { q:`A line graph of a patient's temperature over time rises steeply between hour 2 and hour 4. What does this tell you?`, ch:[`Temperature stayed constant`,`Temperature dropped quickly`,`Temperature increased quickly`,`The data is invalid`], ans:2, exp:`A steep upward slope on a line graph means the value on the y-axis, temperature in this case, is increasing rapidly over that time period.` },
      { q:`Which type of graph is best for comparing distinct categories, like the number of patients with each blood type?`, ch:[`Line graph`,`Bar graph`,`Scatter plot`,`Only a pie graph`], ans:1, exp:`Bar graphs are ideal for comparing separate categories side by side, such as counts for blood types A, B, AB, and O, because each bar clearly shows one category's value.` },
      { q:`In a data set, what is an outlier?`, ch:[`The average of all data points`,`A data point that is far away from most other data points`,`The first data point collected`,`The unit of measurement used`], ans:1, exp:`An outlier is a value that stands apart from the general pattern of the data, which might indicate an unusual case, a measurement error, or something worth investigating further.` },
      { q:`A scatter plot shows that as hours of exercise increase, resting heart rate tends to decrease. This pattern is called what?`, ch:[`No correlation`,`A positive correlation`,`A negative correlation`,`An outlier`], ans:2, exp:`When one variable increases while the other decreases, that is a negative correlation. As exercise hours go up and heart rate goes down, the two variables move in opposite directions.` },
    ]
  },
  {
    id:`pb26`, cat:`Physical Sciences`, title:`Friction & Simple Motion in Daily Life Basics`, diff:`Easy`,
    qs:[
      { q:`What is friction?`, ch:[`A force that pushes objects forward`,`A force that resists motion between two surfaces in contact`,`A type of energy stored in objects`,`The force that pulls objects toward Earth`], ans:1, exp:`Friction is a resistive force that opposes relative motion between surfaces that touch each other, such as your shoes on the sidewalk or a book sliding across a table.` },
      { q:`Which type of friction must be overcome to start moving an object that is currently at rest?`, ch:[`Kinetic friction`,`Static friction`,`Air resistance`,`Rolling friction`], ans:1, exp:`Static friction acts on objects that are not yet moving and must be overcome before the object starts to slide, which is why it can feel hard to get a heavy box moving at first.` },
      { q:`Why is it harder to walk normally on ice than on pavement?`, ch:[`Ice has more friction than pavement`,`Ice is colder, which increases friction`,`Ice has very little friction, so your shoes cannot grip well`,`There is no friction on any surface`], ans:2, exp:`Ice is extremely smooth and slippery, meaning it produces much less friction than rough pavement, so shoes cannot grip it well, making it easy to slip.` },
      { q:`Rubbing your hands together quickly to warm them up on a cold day demonstrates that friction produces what?`, ch:[`Light`,`Heat`,`Electricity`,`Sound only`], ans:1, exp:`Friction between your hands converts some of the mechanical energy of rubbing into thermal energy, which you feel as warmth.` },
      { q:`Why do wheels reduce the effort needed to move heavy objects compared to sliding them?`, ch:[`Rolling friction is generally much lower than sliding friction`,`Wheels eliminate gravity`,`Wheels increase the object's mass`,`Wheels create more surface contact`], ans:0, exp:`Rolling friction is usually much smaller than sliding friction because a rolling wheel has less resistance at the contact point, which is why carts and wheelchairs are so much easier to move than dragging the same load.` },
    ]
  },
  {
    id:`pb27`, cat:`Physical Sciences`, title:`Energy Transformations Basics`, diff:`Easy`,
    qs:[
      { q:`The law of conservation of energy states that energy cannot be created or destroyed, only what?`, ch:[`Measured`,`Transformed from one form to another`,`Increased over time`,`Removed from a system`], ans:1, exp:`Energy is never lost or gained overall; it simply changes form, like chemical energy turning into kinetic energy when you move.` },
      { q:`As a roller coaster car climbs to the top of the first hill and then drops, what energy transformation happens on the way down?`, ch:[`Kinetic energy converts to potential energy`,`Potential energy converts to kinetic energy`,`Chemical energy converts to nuclear energy`,`Sound energy converts to light energy`], ans:1, exp:`At the top of the hill the car has a lot of stored gravitational potential energy. As it drops, that potential energy converts into kinetic energy, the energy of motion, making the car speed up.` },
      { q:`When your muscles use glucose to contract and move your body, what energy transformation is happening?`, ch:[`Chemical energy converts to mechanical energy`,`Nuclear energy converts to thermal energy`,`Electrical energy converts to chemical energy`,`Light energy converts to sound energy`], ans:0, exp:`Glucose stores chemical energy, and your muscle cells convert that chemical energy into mechanical energy, the physical movement of your body.` },
      { q:`During photosynthesis, plants convert light energy into what form of stored energy?`, ch:[`Nuclear energy`,`Mechanical energy`,`Chemical energy stored in glucose`,`Sound energy`], ans:2, exp:`Plants capture light energy from the sun and use it to build glucose molecules, storing that energy in chemical bonds that can later be released for the plant, or an animal that eats it, to use.` },
      { q:`An old-style incandescent lightbulb converts electrical energy into light, but also wastes a lot of energy as what?`, ch:[`Sound`,`Heat`,`Motion`,`Chemical energy`], ans:1, exp:`Incandescent bulbs are inefficient because most of the electrical energy going in turns into heat rather than useful light, which is why they feel hot to the touch.` },
    ]
  },
  {
    id:`pb28`, cat:`Physical Sciences`, title:`Basic Circuits: Series vs Parallel Basics`, diff:`Easy`,
    qs:[
      { q:`In a series circuit, how many paths are there for electric current to flow?`, ch:[`Only one path`,`Two paths`,`As many paths as there are components`,`Zero paths`], ans:0, exp:`A series circuit connects all components along a single loop, so there is only one path the current can take through every component in turn.` },
      { q:`In a parallel circuit, if one light bulb burns out, what typically happens to the other bulbs on separate branches?`, ch:[`They all turn off`,`They stay lit, because current can still flow through other paths`,`They become much brighter than before`,`The circuit stops generating any electricity`], ans:1, exp:`Parallel circuits give current multiple independent paths (branches). If one branch breaks, current can still flow through the other branches, so the remaining bulbs stay lit.` },
      { q:`Why is household wiring typically built as parallel circuits rather than series circuits?`, ch:[`So that if one appliance stops working, other appliances and lights keep working normally`,`Parallel circuits use less wire overall`,`Parallel circuits are always completely safe from fire`,`Series circuits do not allow electricity to flow at all`], ans:0, exp:`Parallel wiring means each outlet and light has its own path back to the power source, so a problem with one device does not shut off power to the rest of the house.` },
      { q:`In an old-style series circuit of holiday lights, what happens when just one bulb burns out?`, ch:[`Nothing changes`,`Only that one bulb goes dark, the rest stay lit`,`The entire string of lights goes dark`,`The remaining bulbs get brighter`], ans:2, exp:`Since a series circuit has only one path, breaking that path at any point, such as one dead bulb, stops current everywhere, so the whole string goes out.` },
      { q:`Which statement correctly compares total resistance in series versus parallel circuits with identical resistors?`, ch:[`Series circuits always have lower total resistance than parallel circuits`,`Adding more resistors in series decreases total resistance`,`Adding more resistors in parallel decreases total resistance`,`Resistance is always the same in both circuit types`], ans:2, exp:`Adding more parallel branches gives current more paths to flow through, which lowers the overall resistance of the circuit, unlike series circuits where adding resistors increases total resistance.` },
    ]
  },
  {
    id:`pb29`, cat:`Physical Sciences`, title:`Introduction to pH & Household Chemistry Basics`, diff:`Easy`,
    qs:[
      { q:`The pH scale typically ranges from 0 to what number?`, ch:[`7`,`10`,`14`,`100`], ans:2, exp:`The pH scale runs from 0 to 14, with lower numbers being more acidic, higher numbers being more basic (alkaline), and 7 being neutral.` },
      { q:`A substance with a pH below 7 is considered what?`, ch:[`Basic (alkaline)`,`Acidic`,`Neutral`,`Radioactive`], ans:1, exp:`Any pH value below 7 indicates an acidic substance, and the lower the number, the more strongly acidic it is.` },
      { q:`Which household item is a common example of an acidic substance?`, ch:[`Baking soda`,`Vinegar`,`Soap`,`Bleach`], ans:1, exp:`Vinegar contains acetic acid and has a pH around 2 to 3, making it clearly acidic, while baking soda, soap, and bleach are all basic (alkaline).` },
      { q:`Pure water has a pH of about 7, which is considered what?`, ch:[`Strongly acidic`,`Strongly basic`,`Neutral`,`Undefined`], ans:2, exp:`A pH of 7 sits exactly in the middle of the scale and is considered neutral, meaning it is neither acidic nor basic.` },
      { q:`pH indicator paper (litmus paper) is used in a lab to do what?`, ch:[`Measure temperature`,`Estimate how acidic or basic a solution is by a color change`,`Measure the mass of a substance`,`Measure electrical conductivity only`], ans:1, exp:`pH indicator paper changes color depending on the acidity or basicity of the solution it touches, letting scientists quickly estimate a solution's approximate pH.` },
    ]
  },
  {
    id:`pb30`, cat:`Physical Sciences`, title:`Water Properties & Why Life Needs It Basics`, diff:`Medium`,
    qs:[
      { q:`Why is a water molecule described as polar?`, ch:[`It has no charge anywhere on the molecule`,`It has a slightly negative oxygen end and slightly positive hydrogen ends`,`It is made only of positive charges`,`It cannot form bonds with other molecules`], ans:1, exp:`Oxygen pulls shared electrons more strongly than hydrogen does, giving the oxygen end of the molecule a slight negative charge and the hydrogen ends a slight positive charge. This uneven charge distribution makes water polar.` },
      { q:`Water molecules sticking to each other through hydrogen bonds is called what property, which allows small insects to walk on water's surface?`, ch:[`Adhesion`,`Density`,`Cohesion, which creates surface tension`,`Viscosity`], ans:2, exp:`Cohesion is water molecules attracting each other. This creates surface tension, a thin, film-like layer at the water's surface strong enough to support small insects like water striders.` },
      { q:`Water is often called the universal solvent because it can dissolve so many substances. This ability is mainly due to what property?`, ch:[`Its polarity, which lets it surround and separate charged or polar particles`,`Its high freezing point`,`Its lack of hydrogen bonds`,`Its clear color`], ans:0, exp:`Because water is polar, its slightly charged ends can surround and pull apart ions and polar molecules, allowing many substances, like salt and sugar, to dissolve in it.` },
      { q:`Why does ice float on liquid water, which is unusual compared to most solids?`, ch:[`Ice is actually warmer than liquid water`,`Ice molecules are packed more densely than liquid water`,`Hydrogen bonds hold ice molecules in a spaced-out crystal structure, making ice less dense than liquid water`,`Ice contains air bubbles that make it float`], ans:2, exp:`As water freezes, hydrogen bonds lock molecules into a rigid, open lattice that takes up more space than in liquid water, making solid ice less dense, so it floats.` },
      { q:`Water has a high specific heat, meaning it takes a lot of energy to change its temperature. Why is this important for living things?`, ch:[`It makes water boil instantly`,`It helps organisms and environments resist rapid temperature changes, keeping conditions stable`,`It prevents water from ever freezing`,`It makes water an electrical insulator`], ans:1, exp:`Because water resists sudden temperature swings, it helps regulate body temperature in organisms and stabilizes climates near oceans and lakes, both of which are important for supporting life.` },
    ]
  },
  {
    id:`pb31`, cat:`Physical Sciences`, title:`Basic Geology: Earthquakes & Volcanoes Basics`, diff:`Easy`,
    qs:[
      { q:`Most earthquakes are caused by the sudden movement of what?`, ch:[`Ocean currents`,`Tectonic plates along faults`,`Wind patterns`,`The Moon's gravity alone`], ans:1, exp:`Earth's crust is broken into large tectonic plates that slowly move. When stress builds up and suddenly releases along a fault, the ground shakes, causing an earthquake.` },
      { q:`The Richter scale, and the modern moment magnitude scale, is used to measure what about an earthquake?`, ch:[`Its exact location only`,`Its magnitude, or the amount of energy released`,`The temperature of the ground`,`The depth of the nearest ocean`], ans:1, exp:`Magnitude scales estimate how much energy an earthquake released. Each whole number increase represents roughly 32 times more energy released.` },
      { q:`A volcanic eruption occurs when molten rock, called magma, does what?`, ch:[`Cools completely underground and never moves`,`Rises through Earth's crust and erupts onto the surface as lava`,`Freezes into ice`,`Turns directly into sedimentary rock`], ans:1, exp:`Magma forms deep underground and, when pressure builds enough, rises through cracks in the crust. Once it reaches the surface, it is called lava.` },
      { q:`A fault is best described as what?`, ch:[`A crack in Earth's crust where blocks of rock have moved relative to each other`,`A type of volcano`,`A layer of the atmosphere`,`A tool used to measure earthquakes`], ans:0, exp:`Faults are fractures in Earth's crust where rock on either side has shifted. Sudden slipping along a fault is what generates most earthquakes.` },
      { q:`The Ring of Fire, a region with many earthquakes and volcanoes, roughly outlines what?`, ch:[`The edges of the Pacific Ocean, where several tectonic plates meet`,`The equator`,`The Arctic Circle`,`The center of the Sahara Desert`], ans:0, exp:`The Ring of Fire traces the boundaries of tectonic plates surrounding the Pacific Ocean, a zone where plate collisions and subduction cause frequent volcanic and seismic activity.` },
    ]
  },
  {
    id:`pb32`, cat:`Physical Sciences`, title:`Intro to Astronomy: Galaxies & the Universe Basics`, diff:`Easy`,
    qs:[
      { q:`Earth, our Sun, and our solar system are located in which galaxy?`, ch:[`Andromeda Galaxy`,`The Milky Way Galaxy`,`Triangulum Galaxy`,`Whirlpool Galaxy`], ans:1, exp:`Our solar system is one of billions of star systems located within the Milky Way, a large spiral galaxy.` },
      { q:`What is a galaxy?`, ch:[`A single star with planets orbiting it`,`A massive collection of stars, gas, dust, and other matter held together by gravity`,`The layer of gases surrounding a planet`,`A man-made satellite`], ans:1, exp:`Galaxies are enormous gravitationally bound systems containing anywhere from millions to trillions of stars, along with gas, dust, and other material.` },
      { q:`A light-year is a unit used in astronomy to measure what?`, ch:[`Time, equal to one year on Earth`,`Distance, equal to how far light travels in one year`,`The brightness of a star`,`The mass of a planet`], ans:1, exp:`Despite the name, a light-year measures distance, specifically the huge distance light travels in one year, about 9.5 trillion kilometers, which astronomers use because space distances are so vast.` },
      { q:`The Big Bang theory describes what scientific idea?`, ch:[`The universe has always looked exactly the same`,`The universe began billions of years ago from an extremely hot, dense state and has been expanding ever since`,`Earth was created before the Sun`,`Stars never move`], ans:1, exp:`The Big Bang theory is the leading scientific explanation for how the universe began, describing an initial extremely hot and dense state around 13.8 billion years ago, followed by continuous expansion.` },
      { q:`Galaxies come in different shapes, including spiral galaxies like the Milky Way and which other common shape?`, ch:[`Elliptical galaxies`,`Square galaxies`,`Triangular galaxies`,`Cubic galaxies`], ans:0, exp:`Besides spiral galaxies, astronomers also classify many galaxies as elliptical, meaning they have a smooth, rounded, oval shape without prominent spiral arms.` },
    ]
  },
  {
    id:`pb33`, cat:`Physical Sciences`, title:`Measuring Temperature & Thermal Expansion Basics`, diff:`Medium`,
    qs:[
      { q:`Which temperature scale is most commonly used in scientific work because zero represents the coldest possible temperature, absolute zero?`, ch:[`Fahrenheit`,`Celsius`,`Kelvin`,`Rankine`], ans:2, exp:`The Kelvin scale starts at absolute zero, the coldest theoretically possible temperature, where all particle motion nearly stops, making it especially useful for scientific calculations.` },
      { q:`Thermal expansion refers to the tendency of most materials to do what as their temperature increases?`, ch:[`Shrink`,`Expand, or increase in size`,`Change color`,`Become magnetic`], ans:1, exp:`As a material's temperature rises, its particles move and vibrate more, which usually pushes them slightly farther apart, causing the material to expand.` },
      { q:`Older liquid thermometers use the expansion of a liquid, like mercury or colored alcohol, to measure temperature. As temperature rises, what happens inside the thermometer tube?`, ch:[`The liquid contracts and the level drops`,`The liquid expands and rises up the narrow tube`,`The liquid freezes solid`,`The glass tube shrinks`], ans:1, exp:`As the liquid inside heats up, it expands and is forced up the thin tube, and the height it reaches is calibrated to a temperature reading.` },
      { q:`Bridges and railroad tracks often include small gaps called expansion joints. Why are these necessary?`, ch:[`To make construction cheaper`,`To allow the material to expand and contract with temperature changes without cracking or buckling`,`To let rainwater drain through only`,`To reduce the bridge's total weight`], ans:1, exp:`Metal and concrete expand in heat and contract in cold. Expansion joints give the material room to change size safely, preventing damage like cracking or buckling.` },
      { q:`To convert a temperature from Celsius to Kelvin, what do you do?`, ch:[`Multiply by 1.8 and add 32`,`Add about 273`,`Subtract about 273`,`Divide by 2`], ans:1, exp:`The Kelvin scale is shifted from Celsius so that 0 degrees C equals about 273 K. To convert Celsius to Kelvin, simply add 273 (more precisely, 273.15).` },
    ]
  },
  {
    id:`pb34`, cat:`Physical Sciences`, title:`Basic Optics: Lenses & How Eyeglasses Work`, diff:`Medium`,
    qs:[
      { q:`A convex (converging) lens is thicker in the middle than at the edges and is typically used to correct which vision problem?`, ch:[`Nearsightedness`,`Farsightedness (hyperopia)`,`Colorblindness`,`Astigmatism only`], ans:1, exp:`Farsighted eyes focus light behind the retina. A convex lens bends light rays inward (converges them) sooner, helping the image focus correctly on the retina.` },
      { q:`A concave (diverging) lens is thinner in the middle than at the edges and is typically used to correct which vision problem?`, ch:[`Nearsightedness (myopia)`,`Farsightedness`,`Cataracts`,`Colorblindness`], ans:0, exp:`Nearsighted eyes focus light in front of the retina. A concave lens spreads light rays outward (diverges them) before they enter the eye, pushing the focus point back onto the retina.` },
      { q:`Refraction is the bending of light as it does what?`, ch:[`Reflects off a mirror`,`Passes from one transparent material into another, like from air into glass, at an angle`,`Travels through a vacuum only`,`Is absorbed completely`], ans:1, exp:`Light bends, or refracts, when it changes speed while crossing the boundary between two different transparent materials, such as moving from air into a glass lens.` },
      { q:`In the human eye, which two structures work together to bend (refract) light so it focuses on the retina?`, ch:[`The eyelid and eyelashes`,`The cornea and the lens`,`The pupil and iris only`,`The retina and optic nerve`], ans:1, exp:`The cornea does most of the initial light bending, and the flexible lens fine-tunes the focus, working together to project a clear image onto the retina at the back of the eye.` },
      { q:`The focal point of a lens is best described as what?`, ch:[`The exact geometric center of the lens`,`The point where parallel light rays meet, or appear to meet, after passing through the lens`,`The outer edge of the lens`,`The color of light passing through the lens`], ans:1, exp:`The focal point is where light rays that enter a lens parallel to each other converge (or appear to spread from), and it determines how strongly a lens bends light.` },
    ]
  },
  {
    id:`pb35`, cat:`Physical Sciences`, title:`Basic Nuclear Chemistry: Fission vs Fusion Basics`, diff:`Medium`,
    qs:[
      { q:`Nuclear fission is a process in which what happens to an atom's nucleus?`, ch:[`Two small nuclei combine into one larger nucleus`,`A large, unstable nucleus splits into two smaller nuclei, releasing energy`,`The nucleus disappears completely`,`Electrons are added to the nucleus`], ans:1, exp:`In fission, a heavy nucleus, such as uranium-235, is split into smaller nuclei, and this splitting releases a large amount of energy.` },
      { q:`Nuclear fusion is a process in which what happens?`, ch:[`A large nucleus splits apart`,`Two small nuclei combine to form a larger nucleus, releasing a huge amount of energy`,`Atoms lose all of their protons`,`Energy is absorbed rather than released`], ans:1, exp:`In fusion, light nuclei, like hydrogen isotopes, combine under extreme conditions to form a heavier nucleus, releasing even more energy per reaction than fission.` },
      { q:`Which nuclear process is currently used to generate electricity in nuclear power plants around the world?`, ch:[`Fusion`,`Fission`,`Both equally`,`Neither; power plants use chemical reactions only`], ans:1, exp:`Today's nuclear power plants rely on controlled fission reactions, usually splitting uranium atoms, to release heat that is used to generate electricity.` },
      { q:`Fusion, the process that powers the Sun, requires what kind of conditions to occur?`, ch:[`Extremely low temperature and pressure`,`Extremely high temperature and pressure, like inside a star's core`,`Room temperature and normal pressure`,`Complete darkness`], ans:1, exp:`Fusing nuclei together requires overcoming strong repulsive forces between positively charged nuclei, which needs the extreme temperature and pressure found in the core of stars like the Sun.` },
      { q:`In medicine, radioactive isotopes (related to nuclear chemistry) are commonly used for what purpose?`, ch:[`Curing the common cold`,`Medical imaging, like PET scans, and treating certain cancers with radiation therapy`,`Replacing blood transfusions`,`Sterilizing surgical tools only`], ans:1, exp:`Certain radioactive isotopes are used in imaging techniques like PET scans to see inside the body, and in radiation therapy to target and destroy cancer cells.` },
    ]
  },
];
