// Life Sciences — high-school-to-early-undergrad basics (lb01-lb35).
// Companion set to bioBiochem.js: kept intentionally introductory (Easy/Medium only),
// covering anatomy, physiology, microbiology, and health-literacy topics not in the MCAT-level bank.
export const LIFE_SCIENCES_BASICS = [
{
  id:`lb01`, cat:`Life Sciences`, title:`Skeletal System Basics`, diff:`Easy`,
  qs:[
    { q:`About how many bones does the adult human skeleton have?`, ch:[`106`,`206`,`306`,`406`], ans:1, exp:`The adult human skeleton has 206 bones. Babies are actually born with more bones, but many fuse together as the body grows.` },
    { q:`What is one of the main jobs of bone marrow?`, ch:[`Digesting food`,`Filtering blood plasma`,`Producing blood cells`,`Contracting to move joints`], ans:2, exp:`Red bone marrow, found inside certain bones, produces red blood cells, white blood cells, and platelets.` },
    { q:`What type of joint is the knee, allowing back-and-forth motion like a door?`, ch:[`Hinge joint`,`Ball-and-socket joint`,`Pivot joint`,`Fixed joint`], ans:0, exp:`The knee is a hinge joint, which allows movement mainly in one direction, similar to how a door swings on its hinges.` },
    { q:`Which is the longest bone in the human body?`, ch:[`Humerus`,`Tibia`,`Fibula`,`Femur`], ans:3, exp:`The femur, or thigh bone, is the longest and one of the strongest bones in the body, supporting most of your body weight when you stand or walk.` },
    { q:`What type of tissue connects bone to bone at a joint?`, ch:[`Tendon`,`Ligament`,`Cartilage`,`Muscle fiber`], ans:1, exp:`Ligaments are tough, fibrous connective tissue that hold bones together at joints. Tendons, by contrast, connect muscle to bone.` },
  ]
},
{
  id:`lb02`, cat:`Life Sciences`, title:`Muscular System Basics`, diff:`Easy`,
  qs:[
    { q:`Which type of muscle tissue makes up the walls of the heart?`, ch:[`Skeletal muscle`,`Cardiac muscle`,`Smooth muscle`,`Voluntary muscle`], ans:1, exp:`Cardiac muscle is found only in the heart. It contracts rhythmically and automatically without you having to think about it.` },
    { q:`Which type of muscle is under your voluntary control, like the muscles you use to walk or write?`, ch:[`Cardiac muscle`,`Smooth muscle`,`Skeletal muscle`,`Involuntary muscle`], ans:2, exp:`Skeletal muscles attach to bones and are controlled voluntarily, meaning you consciously decide when to move them.` },
    { q:`What tough tissue attaches skeletal muscles to bones?`, ch:[`Ligaments`,`Tendons`,`Cartilage`,`Joints`], ans:1, exp:`Tendons are strong, fibrous cords that connect muscle to bone, allowing the pull of a contracting muscle to move the skeleton.` },
    { q:`Muscle fatigue during hard exercise is partly caused by what?`, ch:[`A lack of oxygen and a buildup of waste products in the muscle`,`Too much water in the bloodstream`,`Excess protein in the muscle fibers`,`New bone growth around the muscle`], ans:0, exp:`When muscles work hard without enough oxygen, waste products like lactic acid can build up, contributing to that tired, burning feeling.` },
    { q:`What describes the way muscles like the biceps and triceps work together, one contracting while the other relaxes?`, ch:[`Antagonistic pairs`,`Synergist pairs`,`Fixator pairs`,`Isometric pairs`], ans:0, exp:`Muscles often work in antagonistic pairs. When the biceps contracts to bend the elbow, the triceps relaxes, and vice versa to straighten it.` },
  ]
},
{
  id:`lb03`, cat:`Life Sciences`, title:`Integumentary System (Skin) Basics`, diff:`Easy`,
  qs:[
    { q:`What is the largest organ of the human body?`, ch:[`Skin`,`Liver`,`Lungs`,`Heart`], ans:0, exp:`The skin is the body's largest organ, covering the entire body and making up about 15 percent of total body weight.` },
    { q:`What is the outermost layer of the skin called?`, ch:[`Dermis`,`Hypodermis`,`Epidermis`,`Subcutaneous layer`], ans:2, exp:`The epidermis is the thin, outer layer of skin that acts as a waterproof barrier and gives skin its color.` },
    { q:`Which structures in the skin produce sweat to help cool the body?`, ch:[`Sweat glands`,`Sebaceous glands`,`Hair follicles`,`Melanocytes`], ans:0, exp:`Sweat glands release sweat onto the skin's surface, which cools the body as it evaporates. Sebaceous glands, in contrast, produce oil.` },
    { q:`What pigment gives skin its color and helps protect it from UV radiation?`, ch:[`Keratin`,`Collagen`,`Melanin`,`Hemoglobin`], ans:2, exp:`Melanin is produced by cells called melanocytes. More melanin means darker skin and generally more natural protection from the sun's UV rays.` },
    { q:`Besides protecting the body, what important process does skin help regulate?`, ch:[`Blood cell production`,`Body temperature`,`Protein digestion`,`Hormone release from the brain`], ans:1, exp:`Skin helps regulate body temperature through sweating and by adjusting blood flow near the surface to release or conserve heat.` },
  ]
},
{
  id:`lb04`, cat:`Life Sciences`, title:`Special Senses: The Eye Basics`, diff:`Medium`,
  qs:[
    { q:`Which part of the eye changes shape to help you focus on near and far objects?`, ch:[`Cornea`,`Lens`,`Retina`,`Pupil`], ans:1, exp:`The lens sits behind the pupil and changes shape, a process called accommodation, to bend light so it focuses sharply on the retina.` },
    { q:`Which structure controls how much light enters the eye by changing the size of the pupil?`, ch:[`Retina`,`Cornea`,`Iris`,`Sclera`], ans:2, exp:`The iris is the colored ring of muscle around the pupil. It contracts or relaxes to make the pupil smaller or larger depending on light levels.` },
    { q:`What is the light-sensitive layer at the back of the eye that converts light into nerve signals?`, ch:[`Retina`,`Lens`,`Cornea`,`Optic nerve`], ans:0, exp:`The retina contains light-sensitive cells that convert incoming light into electrical signals, which are then sent to the brain.` },
    { q:`Along with rods, what are the other type of light-detecting cells found in the retina?`, ch:[`Cones`,`Neurons`,`Fibers`,`Discs`], ans:0, exp:`Rods detect light and dark and work well in dim light, while cones detect color and detail and work best in bright light.` },
    { q:`In nearsightedness (myopia), where does light tend to focus relative to the retina?`, ch:[`Directly on the retina`,`In front of the retina`,`Behind the retina`,`Outside the eye entirely`], ans:1, exp:`In myopia, the eyeball is often slightly longer than normal, causing light to focus in front of the retina instead of directly on it, blurring distant objects.` },
  ]
},
{
  id:`lb05`, cat:`Life Sciences`, title:`Special Senses: The Ear & Balance Basics`, diff:`Medium`,
  qs:[
    { q:`What are the three tiny bones in the middle ear collectively called?`, ch:[`Cochlea bones`,`Ossicles`,`Semicircular canals`,`Tympanic bones`], ans:1, exp:`The ossicles (the malleus, incus, and stapes) are the three smallest bones in the body. They pass vibrations from the eardrum to the inner ear.` },
    { q:`Which fluid-filled, spiral-shaped structure in the inner ear is responsible for hearing?`, ch:[`Cochlea`,`Semicircular canals`,`Eustachian tube`,`Pinna`], ans:0, exp:`The cochlea converts sound vibrations into nerve signals that travel to the brain, allowing us to perceive sound.` },
    { q:`Which inner ear structures are mainly responsible for your sense of balance?`, ch:[`Cochlea`,`Semicircular canals`,`Eardrum`,`Ossicles`], ans:1, exp:`The three fluid-filled semicircular canals detect rotation and changes in head position, helping the brain maintain balance.` },
    { q:`What is another common name for the tympanic membrane?`, ch:[`Eardrum`,`Cochlea`,`Ear canal`,`Ossicle`], ans:0, exp:`The eardrum is a thin membrane that vibrates when sound waves hit it, passing those vibrations on to the ossicles in the middle ear.` },
    { q:`What is the main function of the Eustachian tube?`, ch:[`Detecting the pitch of sounds`,`Equalizing air pressure between the middle ear and the throat`,`Filtering earwax out of the ear canal`,`Sensing rotation of the head`], ans:1, exp:`The Eustachian tube connects the middle ear to the back of the throat and helps equalize pressure, which is why your ears sometimes pop during altitude changes.` },
  ]
},
{
  id:`lb06`, cat:`Life Sciences`, title:`Lymphatic System Basics`, diff:`Medium`,
  qs:[
    { q:`What is a main function of the lymphatic system?`, ch:[`Producing hormones for growth`,`Digesting fats only`,`Helping fight infection and returning fluid to the blood`,`Pumping blood throughout the body`], ans:2, exp:`The lymphatic system supports the immune system by filtering out pathogens and also drains excess fluid from tissues back into the bloodstream.` },
    { q:`What are the small, bean-shaped structures that filter lymph fluid and trap pathogens?`, ch:[`Lymph nodes`,`The spleen`,`The thymus`,`Tonsils`], ans:0, exp:`Lymph nodes act like filtering stations along lymphatic vessels, trapping bacteria, viruses, and other harmful particles so immune cells can destroy them.` },
    { q:`Which organ filters blood, recycles old red blood cells, and is part of the lymphatic system?`, ch:[`Liver`,`Spleen`,`Pancreas`,`Kidney`], ans:1, exp:`The spleen filters blood, removes old or damaged red blood cells, and helps the immune system respond to infections.` },
    { q:`Lymphocytes, a key type of white blood cell, mature in which two organs?`, ch:[`Thymus and bone marrow`,`Heart and lungs`,`Liver and spleen`,`Stomach and intestines`], ans:0, exp:`B lymphocytes mature in bone marrow while T lymphocytes mature in the thymus, both becoming important defenders in the immune system.` },
    { q:`Unlike blood, which is pumped by the heart, how does lymph fluid mainly move through the body?`, ch:[`It is pumped by a dedicated lymph heart`,`Through surrounding muscle contractions and one-way valves`,`By gravity alone`,`It does not actually move`], ans:1, exp:`Lymph has no central pump. Instead, it is pushed along mainly by the squeezing action of nearby muscles, with one-way valves keeping it flowing in the right direction.` },
  ]
},
{
  id:`lb07`, cat:`Life Sciences`, title:`Urinary System Basics`, diff:`Easy`,
  qs:[
    { q:`Which organs are primarily responsible for filtering waste out of the blood to form urine?`, ch:[`Liver`,`Kidneys`,`Bladder`,`Pancreas`], ans:1, exp:`The kidneys filter blood continuously, removing waste products and excess water, which become urine.` },
    { q:`What tube carries urine from each kidney down to the bladder?`, ch:[`Urethra`,`Aorta`,`Ureter`,`Esophagus`], ans:2, exp:`Each kidney connects to the bladder by a tube called a ureter. Urine is stored in the bladder until it is released through the urethra.` },
    { q:`Where is urine stored in the body before it is released?`, ch:[`Kidney`,`Ureter`,`Urethra`,`Bladder`], ans:3, exp:`The bladder is a muscular, balloon-like organ that stretches to store urine until it is convenient to urinate.` },
    { q:`What is the basic functional filtering unit inside each kidney called?`, ch:[`Nephron`,`Neuron`,`Alveolus`,`Villus`], ans:0, exp:`Each kidney contains about a million nephrons, tiny structures that filter blood and help form urine.` },
    { q:`Besides removing waste, what else do the kidneys help regulate in the body?`, ch:[`Protein digestion`,`Water and electrolyte balance`,`Muscle contraction speed`,`Visual focus`], ans:1, exp:`Kidneys help control the balance of water, salts, and other electrolytes in the body, which also affects blood pressure.` },
  ]
},
{
  id:`lb08`, cat:`Life Sciences`, title:`Reproductive Anatomy Basics`, diff:`Easy`,
  qs:[
    { q:`Where do egg cells (ova) mature in the female reproductive system?`, ch:[`Uterus`,`Ovaries`,`Fallopian tubes`,`Cervix`], ans:1, exp:`The ovaries are the female reproductive organs that store and mature egg cells and also produce important hormones like estrogen.` },
    { q:`Where does fertilization of an egg by a sperm cell typically occur?`, ch:[`Uterus`,`Ovary`,`Fallopian tube`,`Vagina`], ans:2, exp:`After an egg is released from an ovary, it travels through a fallopian tube, where fertilization by a sperm cell usually takes place.` },
    { q:`Which organ is where a fertilized egg implants and a fetus develops during pregnancy?`, ch:[`Uterus`,`Ovary`,`Cervix`,`Fallopian tube`], ans:0, exp:`The uterus is a muscular organ that expands during pregnancy to support the growth of the developing fetus.` },
    { q:`In the male reproductive system, where are sperm cells produced?`, ch:[`Prostate gland`,`Urethra`,`Testes`,`Bladder`], ans:2, exp:`Sperm cells are produced in the testes, which also produce the hormone testosterone.` },
    { q:`What is the general term for the monthly hormonal cycle that prepares the female body for possible pregnancy?`, ch:[`Circadian cycle`,`Digestive cycle`,`Respiratory cycle`,`Menstrual cycle`], ans:3, exp:`The menstrual cycle is controlled by hormones and involves the release of an egg and changes in the uterine lining roughly every month.` },
  ]
},
{
  id:`lb09`, cat:`Life Sciences`, title:`The Heart & Cardiovascular System Basics`, diff:`Easy`,
  qs:[
    { q:`How many chambers does the human heart have?`, ch:[`2`,`3`,`4`,`5`], ans:2, exp:`The heart has four chambers: the right atrium, right ventricle, left atrium, and left ventricle.` },
    { q:`Which type of blood vessel generally carries blood away from the heart?`, ch:[`Veins`,`Arteries`,`Capillaries`,`Venules`], ans:1, exp:`Arteries carry blood away from the heart, usually under higher pressure, while veins carry blood back toward the heart.` },
    { q:`Which chamber of the heart pumps oxygen-rich blood out to the entire body?`, ch:[`Right atrium`,`Right ventricle`,`Left atrium`,`Left ventricle`], ans:3, exp:`The left ventricle has the thickest, most muscular walls because it must pump blood with enough force to reach the whole body.` },
    { q:`Where does the actual exchange of oxygen and nutrients between blood and body tissues occur?`, ch:[`Arteries`,`Veins`,`Capillaries`,`Aorta`], ans:2, exp:`Capillaries are tiny, thin-walled vessels where oxygen, nutrients, and waste products pass between the blood and surrounding cells.` },
    { q:`What is a typical resting heart rate range for a healthy teen or adult?`, ch:[`20 to 40 beats per minute`,`60 to 100 beats per minute`,`150 to 200 beats per minute`,`300 to 400 beats per minute`], ans:1, exp:`A normal resting heart rate for most healthy people falls between about 60 and 100 beats per minute, though very fit athletes can be lower.` },
  ]
},
{
  id:`lb10`, cat:`Life Sciences`, title:`The Respiratory System: How We Breathe Basics`, diff:`Easy`,
  qs:[
    { q:`Where does the actual exchange of oxygen and carbon dioxide with the blood take place?`, ch:[`Bronchi`,`Trachea`,`Larynx`,`Alveoli`], ans:3, exp:`Alveoli are tiny, thin-walled air sacs in the lungs where oxygen moves into the blood and carbon dioxide moves out.` },
    { q:`Which muscle sits beneath the lungs and contracts to help pull air into the body?`, ch:[`Diaphragm`,`Intercostal muscle`,`Trapezius`,`Esophagus`], ans:0, exp:`The diaphragm is a dome-shaped muscle that flattens and moves downward when it contracts, expanding the chest cavity so air rushes into the lungs.` },
    { q:`What is another common name for the trachea?`, ch:[`Esophagus`,`Windpipe`,`Bronchus`,`Pharynx`], ans:1, exp:`The trachea, or windpipe, is the tube that carries air from the throat down toward the lungs.` },
    { q:`During normal breathing, what happens as air moves into and out of the lungs?`, ch:[`Oxygen is taken in and carbon dioxide is released`,`Nitrogen is taken in and oxygen is released`,`Carbon dioxide is taken in and oxygen is released`,`Oxygen is taken in and nitrogen is released`], ans:0, exp:`Breathing brings in oxygen, which the body needs for energy production, and removes carbon dioxide, a waste product of that process.` },
    { q:`What small flap of tissue prevents food from entering the trachea when you swallow?`, ch:[`Larynx`,`Epiglottis`,`Uvula`,`Esophagus`], ans:1, exp:`The epiglottis folds down over the opening of the trachea during swallowing, directing food safely into the esophagus instead.` },
  ]
},
{
  id:`lb11`, cat:`Life Sciences`, title:`Digestive System Anatomy Basics`, diff:`Easy`,
  qs:[
    { q:`Where does digestion of food begin?`, ch:[`Stomach`,`Mouth`,`Esophagus`,`Small intestine`], ans:1, exp:`Digestion begins in the mouth, where chewing breaks food apart mechanically and saliva starts breaking down starches chemically.` },
    { q:`Where does most nutrient absorption into the bloodstream occur?`, ch:[`Stomach`,`Large intestine`,`Small intestine`,`Esophagus`], ans:2, exp:`The small intestine has a huge surface area lined with finger-like projections called villi, which absorb most nutrients from digested food.` },
    { q:`Which organ produces bile, a substance that helps digest fats?`, ch:[`Pancreas`,`Liver`,`Gallbladder`,`Spleen`], ans:1, exp:`The liver produces bile, which helps break large fat globules into smaller droplets so they can be digested more easily.` },
    { q:`Which organ stores and concentrates bile until it is needed?`, ch:[`Liver`,`Pancreas`,`Gallbladder`,`Stomach`], ans:2, exp:`The gallbladder is a small sac that stores bile made by the liver and releases it into the small intestine when fatty food is eaten.` },
    { q:`What is a main function of the large intestine?`, ch:[`Absorbing water and forming solid waste`,`Digesting proteins with strong acid`,`Producing digestive enzymes`,`Absorbing most nutrients from food`], ans:0, exp:`The large intestine absorbs water and remaining salts from digested material, turning it into the solid waste that is eventually eliminated.` },
  ]
},
{
  id:`lb12`, cat:`Life Sciences`, title:`Blood & Blood Types (ABO/Rh) Basics`, diff:`Medium`,
  qs:[
    { q:`What are the four main blood types in the ABO blood group system?`, ch:[`A, B, AB, and O`,`A, B, C, and D`,`Positive, Negative, Mixed, and Neutral`,`Type 1, Type 2, Type 3, and Type 4`], ans:0, exp:`The ABO system classifies blood into types A, B, AB, and O, based on specific markers found on the surface of red blood cells.` },
    { q:`What does the Rh factor (the plus or minus in a blood type) indicate?`, ch:[`Blood pressure level`,`The amount of iron in the blood`,`Blood type based on plasma color`,`The presence or absence of a specific protein on red blood cells`], ans:3, exp:`The Rh factor refers to a protein that may or may not be present on red blood cells. If it is present, the blood type is Rh-positive; if absent, it is Rh-negative.` },
    { q:`Which blood type is often called the universal donor for red blood cell transfusions?`, ch:[`AB positive`,`O negative`,`A positive`,`B negative`], ans:1, exp:`O negative blood lacks the A, B, and Rh markers, so it can generally be given to patients of any blood type in an emergency.` },
    { q:`Which blood type is often called the universal recipient?`, ch:[`O negative`,`A negative`,`AB positive`,`B positive`], ans:2, exp:`People with AB positive blood have all the major markers already present, so their immune system usually accepts blood from any ABO/Rh type.` },
    { q:`What is the straw-colored liquid part of blood, which carries cells, nutrients, and waste, called?`, ch:[`Plasma`,`Serum`,`Platelets`,`Marrow`], ans:0, exp:`Plasma makes up over half of blood volume and is mostly water. It carries blood cells, nutrients, hormones, and waste products throughout the body.` },
  ]
},
{
  id:`lb13`, cat:`Life Sciences`, title:`Homeostasis & Feedback Loops Basics`, diff:`Medium`,
  qs:[
    { q:`What is homeostasis?`, ch:[`The process of digestion`,`The growth of new cells`,`The body's ability to maintain a stable internal environment`,`The immune response to infection`], ans:2, exp:`Homeostasis refers to the body's tendency to keep internal conditions, like temperature and blood sugar, within a stable, healthy range.` },
    { q:`Shivering when you are cold is the body's way of trying to maintain stable what?`, ch:[`Blood sugar levels`,`Body temperature`,`Digestive rate`,`Hair growth rate`], ans:1, exp:`Shivering generates heat through rapid muscle contractions, helping to bring body temperature back up toward its normal set point.` },
    { q:`In a negative feedback loop, when a value moves away from its normal set point, the body responds by doing what?`, ch:[`Bringing the value back toward normal`,`Pushing the value further away`,`Ignoring the change completely`,`Permanently increasing the set point`], ans:0, exp:`Negative feedback loops work to counteract change, pulling a value that has drifted away from normal back toward its set point.` },
    { q:`Which of the following is an example of a negative feedback loop in the body?`, ch:[`Labor contractions during childbirth`,`Fever response amplification`,`Regulation of blood glucose levels by insulin`,`The blood clotting cascade`], ans:2, exp:`When blood sugar rises after eating, the pancreas releases insulin to lower it back toward normal, a classic negative feedback loop.` },
    { q:`Positive feedback loops are less common in the body because they tend to do what?`, ch:[`Push the body further from a set point until a process is complete`,`Maintain a perfectly stable balance`,`Have no real effect on the body`,`Only occur while a person is sleeping`], ans:0, exp:`Unlike negative feedback, positive feedback loops amplify a change rather than reversing it, which is why they are usually reserved for processes with a clear endpoint, like childbirth.` },
  ]
},
{
  id:`lb14`, cat:`Life Sciences`, title:`Osmosis & Diffusion Basics`, diff:`Medium`,
  qs:[
    { q:`Diffusion is the movement of particles from an area of what concentration to what concentration?`, ch:[`Low concentration to high concentration`,`High concentration to low concentration`,`Equal areas only`,`No movement occurs`], ans:1, exp:`Diffusion is the natural movement of particles from where they are more concentrated to where they are less concentrated, until they are evenly spread out.` },
    { q:`Osmosis specifically refers to the diffusion of which substance across a membrane?`, ch:[`Glucose`,`Oxygen`,`Salt`,`Water`], ans:3, exp:`Osmosis is a special case of diffusion that refers specifically to water molecules moving across a selectively permeable membrane.` },
    { q:`A cell placed in a hypertonic solution (higher solute concentration outside the cell) will likely do what?`, ch:[`Shrink as water leaves the cell`,`Swell and burst`,`Stay exactly the same size`,`Divide rapidly`], ans:0, exp:`In a hypertonic solution, water moves out of the cell toward the area of higher solute concentration outside, causing the cell to shrink.` },
    { q:`A cell placed in a hypotonic solution (lower solute concentration outside the cell) will likely do what?`, ch:[`Shrink`,`Turn to stone`,`Swell and possibly burst`,`Dissolve completely`], ans:2, exp:`In a hypotonic solution, water moves into the cell from the area of lower solute concentration outside, which can cause the cell to swell and potentially burst.` },
    { q:`Why can osmosis and diffusion occur across cell membranes without the cell using energy?`, ch:[`Membranes actively pump every particle`,`Membranes are selectively permeable, allowing passive movement`,`Cells have no membrane at all`,`Membranes are completely impermeable`], ans:1, exp:`Cell membranes are selectively permeable, meaning some substances can pass through freely along their concentration gradient without the cell spending energy.` },
  ]
},
{
  id:`lb15`, cat:`Life Sciences`, title:`Enzymes: How They Work Basics`, diff:`Medium`,
  qs:[
    { q:`What is the main job of an enzyme in the body?`, ch:[`Storing genetic information`,`Transporting oxygen in the blood`,`Speeding up chemical reactions`,`Providing structural support to bones`], ans:2, exp:`Enzymes are biological catalysts, meaning they speed up chemical reactions in the body without being used up themselves.` },
    { q:`Enzymes are typically made of which type of molecule?`, ch:[`Proteins`,`Carbohydrates`,`Lipids`,`Nucleic acids`], ans:0, exp:`Most enzymes are proteins, folded into specific three-dimensional shapes that allow them to interact with particular molecules.` },
    { q:`What is the specific part of an enzyme where a substrate binds called?`, ch:[`Nucleus`,`Cell membrane`,`Ribosome`,`Active site`], ans:3, exp:`The active site is a uniquely shaped region on the enzyme where the substrate molecule fits, similar to a key fitting into a lock.` },
    { q:`What commonly happens to an enzyme when it is exposed to very high temperatures?`, ch:[`It permanently works faster`,`It denatures and loses its shape and function`,`It turns into a substrate molecule`,`It duplicates itself`], ans:1, exp:`High heat can break the bonds holding an enzyme's shape together, causing it to denature. Once denatured, it usually can no longer do its job.` },
    { q:`The "lock and key" model is used to describe how enzymes interact with their substrates in what way?`, ch:[`Enzymes fit specifically with their matching substrate`,`Enzymes store energy for later use`,`Enzymes break down into smaller enzymes`,`Enzymes travel freely through the bloodstream`], ans:0, exp:`The lock and key model illustrates how an enzyme's active site is shaped to fit only certain substrates, much like a specific key fits only one lock.` },
  ]
},
{
  id:`lb16`, cat:`Life Sciences`, title:`Human Reflexes & the Nervous System Basics`, diff:`Easy`,
  qs:[
    { q:`What is a reflex?`, ch:[`A learned behavior`,`A voluntary muscle movement`,`A type of long-term memory`,`An automatic, rapid response to a stimulus`], ans:3, exp:`A reflex is an automatic, involuntary response that happens quickly, such as pulling your hand away from something hot, often before you consciously realize it.` },
    { q:`Which structure often processes a reflex signal without first involving the brain?`, ch:[`Cerebrum`,`Spinal cord`,`Cerebellum`,`Hypothalamus`], ans:1, exp:`Many reflexes are processed by the spinal cord alone, allowing an extremely fast response before the signal even reaches the brain for conscious processing.` },
    { q:`What is the pathway a nerve signal travels during a reflex called?`, ch:[`Reflex arc`,`Nerve loop`,`Synapse chain`,`Neural bridge`], ans:0, exp:`A reflex arc is the neural pathway that controls a reflex action, typically running from a sensory receptor, through the spinal cord, and out to a muscle.` },
    { q:`What is the basic building-block cell of the nervous system called?`, ch:[`Neuron`,`Nephron`,`Osteocyte`,`Myocyte`], ans:0, exp:`Neurons are specialized cells that transmit electrical and chemical signals throughout the nervous system.` },
    { q:`What is the small gap between two neurons, where chemical signals pass from one to the next, called?`, ch:[`Axon`,`Dendrite`,`Synapse`,`Node`], ans:2, exp:`At a synapse, an electrical signal in one neuron triggers the release of chemical messengers called neurotransmitters, which cross the gap to the next neuron.` },
  ]
},
{
  id:`lb17`, cat:`Life Sciences`, title:`The Endocrine System: Glands & Hormones Basics`, diff:`Easy`,
  qs:[
    { q:`What do endocrine glands release directly into the bloodstream?`, ch:[`Hormones`,`Enzymes`,`Antibodies`,`Neurotransmitters`], ans:0, exp:`Endocrine glands secrete hormones directly into the blood, which then travel throughout the body to reach target cells and organs.` },
    { q:`Which gland is often called the "master gland" because it controls many other endocrine glands?`, ch:[`Thyroid`,`Adrenal gland`,`Pituitary gland`,`Pancreas`], ans:2, exp:`The pituitary gland, located at the base of the brain, releases hormones that regulate the activity of many other glands throughout the body.` },
    { q:`Which gland produces insulin to help regulate blood sugar levels?`, ch:[`Thyroid`,`Adrenal glands`,`Pituitary gland`,`Pancreas`], ans:3, exp:`The pancreas produces insulin, a hormone that helps cells absorb glucose from the blood, lowering blood sugar levels after eating.` },
    { q:`The thyroid gland, located in the neck, primarily helps regulate which body process?`, ch:[`Blood pressure`,`Digestion`,`Metabolism`,`Immune response`], ans:2, exp:`The thyroid gland produces hormones that control metabolism, meaning how quickly the body converts food into energy.` },
    { q:`Adrenaline (epinephrine), released by the adrenal glands, prepares the body for what?`, ch:[`Sleep`,`Fight-or-flight response`,`Slow digestion`,`Bone growth`], ans:1, exp:`Adrenaline is released in stressful or exciting situations and quickly increases heart rate, energy, and alertness, preparing the body to react fast.` },
  ]
},
{
  id:`lb18`, cat:`Life Sciences`, title:`Aging & the Human Body Basics`, diff:`Easy`,
  qs:[
    { q:`As people age, what typically happens to bone density?`, ch:[`It decreases, making bones more fragile`,`It increases steadily`,`It stays exactly the same`,`It doubles`], ans:0, exp:`Bone density tends to decrease with age, which can make bones more fragile and increase the risk of fractures, especially in older adults.` },
    { q:`Age-related decline in which body system can lead to presbyopia, or difficulty focusing on close objects?`, ch:[`Digestive system`,`Skeletal system`,`Visual system`,`Respiratory system`], ans:2, exp:`As the lens of the eye becomes less flexible with age, many people develop presbyopia, a common condition that makes reading up close harder.` },
    { q:`Skin tends to become more wrinkled with age largely due to a decrease in the production of what?`, ch:[`Melanin`,`Collagen and elastin`,`Keratin`,`Sweat`], ans:1, exp:`Collagen and elastin are proteins that keep skin firm and elastic. Their production slows with age, contributing to wrinkles and looser skin.` },
    { q:`The natural loss of muscle mass and strength that comes with aging is called what?`, ch:[`Osteoporosis`,`Arthritis`,`Atrophy syndrome`,`Sarcopenia`], ans:3, exp:`Sarcopenia is the gradual, age-related loss of muscle mass and strength, though regular exercise can help slow this process.` },
    { q:`Which lifestyle habits are commonly recommended to support healthy aging?`, ch:[`Regular exercise, a balanced diet, and adequate sleep`,`A sedentary lifestyle and a high-sugar diet`,`Avoiding all social contact`,`Skipping regular medical checkups`], ans:0, exp:`Staying physically active, eating well, sleeping enough, and getting regular checkups are all habits associated with healthier aging and a longer, more active life.` },
  ]
},
{
  id:`lb19`, cat:`Life Sciences`, title:`Microbiology Basics: Bacteria, Viruses & Fungi`, diff:`Easy`,
  qs:[
    { q:`Which of these is NOT made of a living cell?`, ch:[`A bacterium`,`A virus`,`A fungal cell`,`A human skin cell`], ans:1, exp:`Viruses aren't cells at all — they're just genetic material wrapped in a protein coat, and they need a host cell's machinery to reproduce.` },
    { q:`What kingdom do mushrooms and molds belong to?`, ch:[`Plantae`,`Animalia`,`Fungi`,`Protista`], ans:2, exp:`Mushrooms and molds are fungi, a separate kingdom from plants and animals with their own unique cell structure.` },
    { q:`Bacteria are classified as which type of organism based on their cell structure?`, ch:[`Eukaryotic`,`Prokaryotic`,`Viral`,`Multicellular only`], ans:1, exp:`Bacteria are prokaryotic, meaning their cells lack a nucleus and other membrane-bound organelles.` },
    { q:`What is the main basic difference between bacteria/fungi and viruses?`, ch:[`Bacteria and fungi are made of cells; viruses are not`,`Viruses are always larger than bacteria`,`Fungi can't cause disease`,`Bacteria always help the body`], ans:0, exp:`Bacteria and fungi are true living cells that can grow and divide on their own, while viruses aren't cells and can't reproduce without a host.` },
    { q:`Which of these is an example of bacteria being beneficial rather than harmful?`, ch:[`Causing strep throat`,`Helping digest food in the gut`,`Causing athlete's foot`,`Causing the common cold`], ans:1, exp:`Many bacteria living in the human gut actually help break down food and support digestion — not all bacteria cause disease.` },
  ]
},
{
  id:`lb20`, cat:`Life Sciences`, title:`Taxonomy & Classification of Living Things Basics`, diff:`Easy`,
  qs:[
    { q:`Who is credited with developing the modern system of naming organisms with two-part Latin names?`, ch:[`Charles Darwin`,`Carl Linnaeus`,`Gregor Mendel`,`Louis Pasteur`], ans:1, exp:`Carl Linnaeus developed binomial nomenclature in the 1700s, the two-name naming system still used today.` },
    { q:`In binomial nomenclature, what does an organism's two-part scientific name represent?`, ch:[`Genus and species`,`Kingdom and phylum`,`Family and order`,`Class and genus`], ans:0, exp:`A scientific name like Homo sapiens gives the genus first (Homo) and the species second (sapiens).` },
    { q:`Which list shows the major taxonomic ranks from broadest to most specific?`, ch:[`Species, Genus, Family, Kingdom`,`Kingdom, Phylum, Class, Order, Family, Genus, Species`,`Phylum, Kingdom, Class, Genus`,`Species, Kingdom, Phylum, Genus`], ans:1, exp:`Classification moves from the broad Kingdom level down through Phylum, Class, Order, Family, and Genus to the most specific level, Species.` },
    { q:`Humans belong to which taxonomic kingdom?`, ch:[`Plantae`,`Fungi`,`Animalia`,`Protista`], ans:2, exp:`Humans are animals, placing us in the kingdom Animalia along with all other multicellular organisms that eat other organisms for energy.` },
    { q:`Two organisms placed in the same genus but different species are best described as...`, ch:[`Identical in every way`,`Closely related but distinct species`,`Completely unrelated organisms`,`Always able to interbreed successfully`], ans:1, exp:`Sharing a genus means organisms are closely related evolutionarily, but different species names mean they're still distinct types of organisms.` },
  ]
},
{
  id:`lb21`, cat:`Life Sciences`, title:`Genetics Vocabulary & Pedigree Charts Basics`, diff:`Medium`,
  qs:[
    { q:`What term describes a specific version of a gene, such as the version for brown eyes versus blue eyes?`, ch:[`Genotype`,`Phenotype`,`Allele`,`Locus`], ans:2, exp:`An allele is one variant form of a gene; different alleles can lead to different traits.` },
    { q:`What is the difference between genotype and phenotype?`, ch:[`Genotype is the physical trait; phenotype is the genetic makeup`,`Genotype is the genetic makeup; phenotype is the observable trait`,`They mean the same thing`,`Genotype only applies to plants`], ans:1, exp:`Genotype refers to the actual genes an organism carries, while phenotype is how those genes are physically expressed and observed.` },
    { q:`In a pedigree chart, what does a filled-in (shaded) shape usually represent?`, ch:[`An unaffected individual`,`An individual affected by the trait being studied`,`A male individual only`,`A deceased individual`], ans:1, exp:`Pedigree charts typically shade in symbols to show which family members show the trait or condition being tracked.` },
    { q:`In pedigree charts, what shape typically represents a male individual?`, ch:[`Circle`,`Triangle`,`Square`,`Diamond`], ans:2, exp:`By convention, squares represent males and circles represent females in pedigree charts.` },
    { q:`If a trait appears in a grandparent and grandchild but skips the parent in between, what does this most likely suggest?`, ch:[`The trait is likely dominant`,`The trait is likely recessive and the parent is a carrier`,`The trait is not genetic at all`,`The trait only affects females`], ans:1, exp:`A trait that skips a generation often points to a recessive allele — the middle-generation parent can carry the allele without showing the trait.` },
  ]
},
{
  id:`lb22`, cat:`Life Sciences`, title:`Dominant vs Recessive Traits Basics`, diff:`Easy`,
  qs:[
    { q:`If a dominant allele (B) and a recessive allele (b) are both present, which trait is typically expressed?`, ch:[`The recessive trait`,`The dominant trait`,`Both traits blend equally`,`Neither trait appears`], ans:1, exp:`When a dominant and recessive allele are paired, the dominant allele's trait is usually the one that shows up.` },
    { q:`An organism with two identical alleles for a trait (like BB or bb) is described as...`, ch:[`Heterozygous`,`Homozygous`,`Hybrid`,`Mutated`], ans:1, exp:`Homozygous means "same" alleles at that gene — both copies match, whether both dominant or both recessive.` },
    { q:`For a recessive trait to actually show up in an organism's appearance, it generally needs...`, ch:[`Just one recessive allele`,`Two recessive alleles`,`One dominant and one recessive allele`,`No alleles at all`], ans:1, exp:`Recessive traits are masked by a dominant allele, so they only appear when an organism has two copies of the recessive allele.` },
    { q:`Mendel found purple flower color dominant over white in pea plants. Crossing a homozygous purple (PP) plant with a homozygous white (pp) plant produces offspring with what flower color?`, ch:[`White`,`Purple`,`A blend of purple and white`,`Half purple, half white flowers on the same plant`], ans:1, exp:`Every offspring gets one P and one p allele, and since purple is dominant, all the offspring flowers appear purple.` },
    { q:`A Punnett square is a tool used to...`, ch:[`Predict possible genetic combinations of offspring`,`Measure the size of chromosomes`,`Identify bacteria under a microscope`,`Sequence an organism's entire DNA`], ans:0, exp:`Punnett squares let scientists and students map out the possible allele combinations offspring could inherit from two parents.` },
  ]
},
{
  id:`lb23`, cat:`Life Sciences`, title:`Stem Cells & Cell Differentiation Basics`, diff:`Medium`,
  qs:[
    { q:`What makes stem cells unique compared to most other cells in the body?`, ch:[`They cannot divide`,`They have the ability to develop into different specialized cell types`,`They are always cancerous`,`They only exist in plants`], ans:1, exp:`Stem cells are unspecialized cells that can divide and turn into various specialized cell types the body needs.` },
    { q:`What term describes the process by which an unspecialized cell becomes a specialized cell, like a nerve or muscle cell?`, ch:[`Differentiation`,`Mutation`,`Replication`,`Fertilization`], ans:0, exp:`Differentiation is the process where a general cell develops specific structures and functions to become a particular cell type.` },
    { q:`Which type of stem cell, found in early embryos, can potentially become almost any cell type in the body?`, ch:[`Adult stem cells`,`Embryonic stem cells`,`Muscle cells`,`Red blood cells`], ans:1, exp:`Embryonic stem cells are especially flexible early on, capable of becoming nearly any of the body's specialized cell types.` },
    { q:`Adult stem cells, such as those found in bone marrow, are typically...`, ch:[`Able to become any cell type in the body`,`More limited, usually becoming only certain related cell types`,`Incapable of dividing at all`,`Found only before birth`], ans:1, exp:`Adult stem cells still divide and specialize, but their options are usually more limited than embryonic stem cells — bone marrow stem cells mainly make blood-related cells.` },
    { q:`Why are stem cells of major interest to medical researchers?`, ch:[`They could potentially help repair or replace damaged tissues`,`They are easier to see under a microscope than other cells`,`They never divide, making them easy to study`,`They only exist in cancer patients`], ans:0, exp:`Because stem cells can become specialized tissue, researchers hope to use them to treat injuries and diseases by regenerating damaged cells.` },
  ]
},
{
  id:`lb24`, cat:`Life Sciences`, title:`Vaccines & How Immunity Works Basics`, diff:`Easy`,
  qs:[
    { q:`How do most vaccines help protect the body from disease?`, ch:[`By killing bacteria directly in the bloodstream`,`By training the immune system to recognize a pathogen without causing full illness`,`By replacing damaged cells`,`By permanently blocking all viruses from entering the body`], ans:1, exp:`Vaccines expose the immune system to a harmless piece or weakened version of a pathogen so it learns to recognize and fight it later.` },
    { q:`What are antibodies?`, ch:[`Proteins made by the immune system that recognize and help fight specific pathogens`,`Cells that carry oxygen in the blood`,`A type of bacteria`,`Structures that help digest food`], ans:0, exp:`Antibodies are specialized proteins the immune system produces to identify and neutralize specific invaders like viruses or bacteria.` },
    { q:`What is "immune memory"?`, ch:[`The immune system's ability to remember and respond faster to a pathogen it has met before`,`The brain's memory of being sick`,`An ingredient found in vaccines`,`The lifespan of a red blood cell`], ans:0, exp:`After exposure to a pathogen (or a vaccine), the immune system keeps cells that "remember" it, allowing a much faster response next time.` },
    { q:`What is herd immunity?`, ch:[`When one person becomes immune to every disease`,`When enough people in a population are immune, slowing disease spread and protecting those who can't be vaccinated`,`A type of vaccine made from animal cells`,`When a virus weakens on its own over time`], ans:1, exp:`When a large share of a community is immune, a disease has fewer people to spread to, which indirectly protects people who can't get vaccinated.` },
    { q:`White blood cells are a key part of which body system, responsible for defending against pathogens?`, ch:[`Digestive system`,`Immune system`,`Skeletal system`,`Respiratory system`], ans:1, exp:`White blood cells are central players in the immune system, patrolling the body to detect and destroy invading pathogens.` },
  ]
},
{
  id:`lb25`, cat:`Life Sciences`, title:`Antibiotics & Antibiotic Resistance Basics`, diff:`Medium`,
  qs:[
    { q:`What do antibiotics treat?`, ch:[`Bacterial infections`,`Viral infections like the common cold`,`Broken bones`,`Genetic disorders`], ans:0, exp:`Antibiotics are designed to kill or stop the growth of bacteria, not viruses.` },
    { q:`Why don't antibiotics work against viruses like the flu?`, ch:[`Viruses are too small to be affected by any medicine`,`Antibiotics target structures and processes specific to bacteria, which viruses don't have`,`Viruses are actually a type of bacteria`,`Antibiotics only work on plants`], ans:1, exp:`Antibiotics work by disrupting bacterial structures or processes; since viruses aren't cells and don't share those structures, antibiotics have nothing to target.` },
    { q:`What is antibiotic resistance?`, ch:[`When a person becomes allergic to antibiotics`,`When bacteria evolve so antibiotics no longer effectively kill them`,`When antibiotics expire and stop working`,`When a virus mutates into a bacterium`], ans:1, exp:`Antibiotic resistance happens when bacteria change over time in ways that let them survive antibiotics that used to kill them.` },
    { q:`Which practice contributes to the development of antibiotic resistance?`, ch:[`Finishing the full prescribed course of antibiotics`,`Not taking antibiotics unless prescribed`,`Overusing or misusing antibiotics, such as stopping treatment early`,`Washing hands regularly`], ans:2, exp:`Misusing antibiotics — like stopping early or taking them for viral illnesses — gives bacteria more chances to survive and develop resistance.` },
    { q:`Through natural selection, why might a bacterial population become mostly resistant to an antibiotic over time?`, ch:[`The antibiotic teaches bacteria how to resist it`,`Resistant bacteria survive treatment and reproduce, passing on resistance traits`,`Antibiotics turn susceptible bacteria into resistant ones`,`Resistance isn't related to evolution`], ans:1, exp:`When an antibiotic kills off susceptible bacteria, any naturally resistant survivors reproduce, gradually making the whole population more resistant.` },
  ]
},
{
  id:`lb26`, cat:`Life Sciences`, title:`Basic Virology: How Viruses Infect Cells`, diff:`Easy`,
  qs:[
    { q:`What two main components does every virus particle have?`, ch:[`A nucleus and cytoplasm`,`Genetic material (DNA or RNA) surrounded by a protein coat`,`A cell wall and flagella`,`Mitochondria and ribosomes`], ans:1, exp:`Unlike true cells, viruses are simply genetic material packaged inside a protective protein shell.` },
    { q:`Why do viruses need to invade a host cell in order to reproduce?`, ch:[`Viruses lack their own cellular machinery to make copies of themselves`,`Viruses are afraid of the immune system`,`Viruses prefer warm environments`,`Viruses need sunlight to reproduce`], ans:0, exp:`Viruses don't have the ribosomes and other machinery needed to build new copies of themselves, so they hijack a host cell's machinery instead.` },
    { q:`What is generally the first step a virus takes when infecting a cell?`, ch:[`It attaches to specific receptors on the surface of a host cell`,`It immediately kills the host cell`,`It changes the host's DNA into RNA`,`It escapes the body through sweat`], ans:0, exp:`Viruses first must bind to matching receptor molecules on a cell's surface before they can get inside and start an infection.` },
    { q:`After a virus releases its genetic material into a host cell, what typically happens next?`, ch:[`The host cell's machinery is hijacked to make new viral copies`,`The virus dissolves and disappears`,`The host cell turns into a bacterium`,`Nothing changes in the host cell`], ans:0, exp:`Once inside, viral genetic material takes over the cell's own copying machinery to produce many new virus particles.` },
    { q:`What often happens to a host cell after it has produced many new virus copies?`, ch:[`It becomes permanently stronger`,`It often bursts or is damaged, releasing new viruses to infect other cells`,`It turns into a stem cell`,`It develops antibiotic resistance`], ans:1, exp:`Many infected cells are damaged or destroyed as they release newly made viruses, which then go on to infect neighboring cells.` },
  ]
},
{
  id:`lb27`, cat:`Life Sciences`, title:`Cell Division & Cancer Basics`, diff:`Medium`,
  qs:[
    { q:`What is the general term for the normal process by which one cell divides into two identical cells?`, ch:[`Meiosis`,`Fertilization`,`Mitosis`,`Differentiation`], ans:2, exp:`Mitosis is the type of cell division that produces two genetically identical daughter cells, used for growth and repair.` },
    { q:`Cancer generally begins when...`, ch:[`Cells stop dividing completely`,`The body produces too many red blood cells`,`Cells become smaller than normal`,`Cells lose the ability to control their own growth and divide uncontrollably`], ans:3, exp:`Cancer starts when changes in a cell's genes cause it to ignore the normal signals that regulate how often cells divide.` },
    { q:`A mass of abnormally dividing cells is called a...`, ch:[`Tumor`,`Antibody`,`Antigen`,`Allele`], ans:0, exp:`A tumor is a lump or mass formed by cells that have divided more than they should.` },
    { q:`What distinguishes a benign tumor from a malignant (cancerous) tumor?`, ch:[`Benign tumors can spread to other parts of the body, malignant cannot`,`There is no real difference`,`Malignant tumors can invade nearby tissue and spread to other parts of the body; benign ones generally do not`,`Benign tumors are always more dangerous`], ans:2, exp:`Malignant tumors can invade surrounding tissue and spread elsewhere in the body, while benign tumors generally stay contained in one place.` },
    { q:`What term describes cancer cells spreading from their original location to other parts of the body?`, ch:[`Mutation`,`Metastasis`,`Replication`,`Differentiation`], ans:1, exp:`Metastasis is the process by which cancer cells break away and travel to establish new tumors in other parts of the body.` },
  ]
},
{
  id:`lb28`, cat:`Life Sciences`, title:`Basic Embryology & Human Development`, diff:`Easy`,
  qs:[
    { q:`What is the single cell formed when a sperm and egg unite called?`, ch:[`Embryo`,`Zygote`,`Fetus`,`Blastocyst`], ans:1, exp:`The zygote is the very first cell of a new individual, formed the moment a sperm fertilizes an egg.` },
    { q:`After the first eight weeks of human development, the developing baby is generally referred to as a...`, ch:[`Zygote`,`Embryo`,`Fetus`,`Blastocyst`], ans:2, exp:`Once major organs have begun forming after about eight weeks, the term shifts from "embryo" to "fetus" for the rest of pregnancy.` },
    { q:`What is the general term for the earliest stage of development, from fertilization through about week 8, when major organs begin to form?`, ch:[`Fetal stage`,`Embryonic stage`,`Infancy`,`Adolescence`], ans:1, exp:`The embryonic stage is when the foundations of all major organs and body systems are first laid down.` },
    { q:`What structure allows nutrients and oxygen to pass from a pregnant person's blood to the developing baby?`, ch:[`The placenta`,`The appendix`,`The spinal cord`,`The trachea`], ans:0, exp:`The placenta is a specialized organ that develops during pregnancy to exchange nutrients, oxygen, and waste between parent and baby.` },
    { q:`Roughly how long is a typical full-term human pregnancy?`, ch:[`About 4 months`,`About 9 months`,`About 15 months`,`About 2 months`], ans:1, exp:`A typical human pregnancy lasts about 9 months, or roughly 40 weeks, from fertilization to birth.` },
  ]
},
{
  id:`lb29`, cat:`Life Sciences`, title:`Plant Structure & Function Basics`, diff:`Easy`,
  qs:[
    { q:`Which plant structure is primarily responsible for absorbing water and nutrients from the soil?`, ch:[`Leaves`,`Roots`,`Flowers`,`Stem`], ans:1, exp:`Roots grow into the soil and are specialized to absorb water and dissolved minerals the plant needs.` },
    { q:`What is the main function of leaves in most plants?`, ch:[`Absorbing water from soil`,`Anchoring the plant in the ground`,`Carrying out photosynthesis to produce food`,`Producing seeds`], ans:2, exp:`Leaves are the plant's main site of photosynthesis, where sunlight, water, and carbon dioxide are converted into food energy.` },
    { q:`What is the green pigment in plant cells that captures light energy for photosynthesis?`, ch:[`Hemoglobin`,`Chlorophyll`,`Melanin`,`Keratin`], ans:1, exp:`Chlorophyll gives plants their green color and absorbs sunlight to power photosynthesis.` },
    { q:`What gas do plants take in during photosynthesis, and what gas do they release?`, ch:[`Take in oxygen, release carbon dioxide`,`Take in carbon dioxide, release oxygen`,`Take in nitrogen, release hydrogen`,`Take in water vapor, release methane`], ans:1, exp:`During photosynthesis, plants absorb carbon dioxide from the air and release oxygen as a byproduct.` },
    { q:`What is the primary function of a plant's stem?`, ch:[`To carry out photosynthesis`,`To support the plant and transport water and nutrients between roots and leaves`,`To absorb sunlight only`,`To produce pollen`], ans:1, exp:`The stem holds the plant upright and acts as a highway, moving water and nutrients between the roots and the leaves.` },
  ]
},
{
  id:`lb30`, cat:`Life Sciences`, title:`Human Nutrition & Digestion Basics`, diff:`Easy`,
  qs:[
    { q:`Which of the following is a macronutrient the body needs in large amounts for energy?`, ch:[`Vitamin C`,`Carbohydrates`,`Iron`,`Calcium`], ans:1, exp:`Carbohydrates, along with proteins and fats, are macronutrients the body needs in relatively large amounts, mainly for energy.` },
    { q:`Where does digestion of food begin?`, ch:[`The stomach`,`The small intestine`,`The mouth`,`The large intestine`], ans:2, exp:`Digestion starts in the mouth, where chewing and enzymes in saliva begin breaking food down.` },
    { q:`What is the main function of the small intestine in digestion?`, ch:[`Storing waste before elimination`,`Absorbing most nutrients into the bloodstream`,`Breaking down food using teeth`,`Producing insulin`], ans:1, exp:`The small intestine is where most nutrient absorption happens, passing digested nutrients into the bloodstream.` },
    { q:`Which organ produces substances that help digest fats, proteins, and carbohydrates in the small intestine?`, ch:[`The pancreas`,`The lungs`,`The skin`,`The heart`], ans:0, exp:`The pancreas releases digestive enzymes into the small intestine that help break down fats, proteins, and carbohydrates.` },
    { q:`What is the main role of dietary fiber, even though the body cannot fully digest it?`, ch:[`It provides most of the body's energy`,`It helps move food through the digestive system and supports gut health`,`It builds muscle tissue`,`It replaces the need for water`], ans:1, exp:`Fiber isn't broken down for energy the way other nutrients are, but it helps keep the digestive system moving smoothly and supports gut health.` },
  ]
},
{
  id:`lb31`, cat:`Life Sciences`, title:`Basic Pharmacology: How Drugs Work in the Body`, diff:`Medium`,
  qs:[
    { q:`In pharmacology, what is a "receptor"?`, ch:[`A type of blood cell`,`A molecule on or in a cell that a drug can bind to, triggering an effect`,`A part of the digestive system`,`A type of bacteria`], ans:1, exp:`Many drugs work by binding to specific receptor molecules on or in cells, which then triggers a biological response.` },
    { q:`What does it generally mean when a drug is described as having a "side effect"?`, ch:[`It is the drug's main intended effect`,`It is an unintended effect the drug causes in addition to its main purpose`,`It means the drug does not work at all`,`It only happens with fake medicine`], ans:1, exp:`A side effect is any effect a drug produces beyond the one it was designed to have, which can range from mild to serious.` },
    { q:`What is the general term for how a drug moves through the body — absorption, distribution, metabolism, and excretion?`, ch:[`Pharmacokinetics`,`Genetics`,`Mitosis`,`Differentiation`], ans:0, exp:`Pharmacokinetics describes the journey a drug takes through the body, from entering the bloodstream to eventually being eliminated.` },
    { q:`Why might a doctor prescribe a different dose of a medication for a child compared to an adult?`, ch:[`Medications cost less for children`,`There is no actual difference in dosing`,`Children's bodies process and respond to drugs differently, often due to smaller body size and different metabolism`,`Children are immune to all drug side effects`], ans:2, exp:`Because children's bodies are smaller and can process drugs at different rates than adults, doses are often adjusted to be safe and effective.` },
    { q:`What organ is primarily responsible for breaking down (metabolizing) many drugs in the body?`, ch:[`The liver`,`The lungs`,`The skin`,`The spleen`], ans:0, exp:`The liver plays a central role in metabolizing many drugs, breaking them down so they can eventually be removed from the body.` },
  ]
},
{
  id:`lb32`, cat:`Life Sciences`, title:`First Aid Basics: Wounds, Burns & Sprains`, diff:`Easy`,
  qs:[
    { q:`What is generally the first step in treating a minor open wound that is bleeding?`, ch:[`Apply direct pressure with a clean cloth to stop the bleeding`,`Immediately apply ice`,`Wrap it tightly with a bandage without cleaning it`,`Ignore it since minor wounds heal on their own`], ans:0, exp:`Applying firm, direct pressure with a clean cloth is usually the first step to control bleeding from a minor wound.` },
    { q:`For a minor first-degree burn, like mild sunburn, what is a recommended first aid step?`, ch:[`Apply butter to the burn`,`Cool the area with cool (not ice-cold) running water`,`Pop any blisters immediately`,`Apply direct heat to the area`], ans:1, exp:`Cooling a minor burn with cool running water helps reduce pain and limit further tissue damage; butter or ice can actually make things worse.` },
    { q:`What does the acronym R.I.C.E. stand for in treating a minor sprain?`, ch:[`Rest, Ice, Compression, Elevation`,`Run, Ice, Clean, Examine`,`Rest, Inspect, Clean, Evaluate`,`Reduce, Isolate, Cover, Elevate`], ans:0, exp:`R.I.C.E. — Rest, Ice, Compression, Elevation — is a common general approach for managing minor sprains and reducing swelling.` },
    { q:`Why is elevating an injured, swollen limb (like a sprained ankle) generally recommended?`, ch:[`It has no real effect on swelling`,`It helps reduce swelling by using gravity to limit blood flow buildup in the area`,`It increases pain intentionally`,`It speeds up bleeding`], ans:1, exp:`Raising an injured limb above heart level uses gravity to help reduce fluid buildup and swelling around the injury.` },
    { q:`When should someone seek professional medical help for a wound rather than just treating it at home?`, ch:[`Never — all wounds should be treated at home`,`Only if it doesn't hurt at all`,`If bleeding doesn't stop with direct pressure, the wound is deep, or signs of infection appear`,`Only if the wound is on the arm`], ans:2, exp:`Wounds that won't stop bleeding, are deep, or show signs of infection (like increasing redness or pus) need professional evaluation.` },
  ]
},
{
  id:`lb33`, cat:`Life Sciences`, title:`CPR & Emergency Response Basics`, diff:`Easy`,
  qs:[
    { q:`What does CPR stand for?`, ch:[`Cardiopulmonary Resuscitation`,`Critical Patient Response`,`Cardiac Pressure Relief`,`Chest Pressure Routine`], ans:0, exp:`CPR stands for Cardiopulmonary Resuscitation, an emergency technique used to help keep blood flowing when someone's heart has stopped.` },
    { q:`What is generally the first thing you should do if you find someone unresponsive in an emergency?`, ch:[`Start chest compressions immediately without checking anything`,`Check the scene for safety and check if the person is responsive, then call 911 (or have someone else call)`,`Give them water to drink`,`Wait quietly and see what happens`], ans:1, exp:`Before acting, it's important to make sure the scene is safe, check responsiveness, and get emergency services on the way quickly.` },
    { q:`In CPR for adults, chest compressions help do what?`, ch:[`Help circulate blood to vital organs when the heart isn't pumping effectively`,`Wake the person up through pain`,`Clear their airway of food`,`Lower their body temperature`], ans:0, exp:`Chest compressions manually help push blood through the body, keeping oxygen flowing to vital organs like the brain until help arrives.` },
    { q:`What is an AED, commonly found in public places like schools and airports?`, ch:[`A type of bandage`,`An automated external defibrillator that can help restore a normal heart rhythm`,`A blood pressure cuff`,`A splint for broken bones`], ans:1, exp:`An AED is a device that can analyze a person's heart rhythm and deliver a shock if needed to help restore a normal heartbeat.` },
    { q:`Why is calling 911 (or the local emergency number) quickly considered a critical step in an emergency?`, ch:[`It's optional and rarely helps`,`It gets trained professional help on the way as fast as possible, which can be life-saving`,`It replaces the need to help the person at all`,`It's only necessary for minor injuries`], ans:1, exp:`Calling for help right away means trained responders start heading to the scene as soon as possible, which can make a major difference in serious emergencies.` },
  ]
},
{
  id:`lb34`, cat:`Life Sciences`, title:`The Skeletal-Muscular Connection: Levers & Movement`, diff:`Medium`,
  qs:[
    { q:`What connects muscle to bone, allowing muscles to pull on bones to create movement?`, ch:[`Ligaments`,`Tendons`,`Cartilage`,`Nerves`], ans:1, exp:`Tendons are tough connective tissue that attach muscles to bones, transmitting the force of a muscle contraction to move the bone.` },
    { q:`What connects bone to bone at a joint, helping stabilize it?`, ch:[`Tendons`,`Ligaments`,`Muscle fibers`,`Tissue`], ans:1, exp:`Ligaments connect bones to other bones across a joint, helping keep the joint stable during movement.` },
    { q:`In the body's lever systems, a joint acts as the fulcrum. Which best describes how the elbow works when you bend your arm?`, ch:[`The elbow joint acts as a fixed point that the forearm bone rotates around as muscles contract`,`The elbow has no role in arm movement`,`Muscles directly move bones without any joint involved`,`The elbow only allows side-to-side movement`], ans:0, exp:`The elbow joint works like the fulcrum of a lever, with the forearm bone rotating around it as the biceps and triceps muscles pull.` },
    { q:`Muscles typically work in antagonistic pairs, meaning...`, ch:[`Both muscles in the pair always contract at the same time`,`One muscle contracts to create movement while its paired muscle relaxes, and they can reverse roles`,`Only one muscle in the body can ever contract`,`Muscle pairs are unrelated to movement`], ans:1, exp:`Antagonistic muscle pairs work opposite each other — as one contracts to create movement, its partner relaxes, and they can switch roles to reverse the motion.` },
    { q:`When you bend your elbow, the biceps contracts while the triceps relaxes. What happens when you straighten your arm again?`, ch:[`Both muscles stay relaxed`,`The biceps contracts further`,`The triceps contracts while the biceps relaxes`,`Neither muscle is involved`], ans:2, exp:`To straighten the arm, the roles reverse — the triceps contracts to extend the elbow while the biceps relaxes.` },
  ]
},
{
  id:`lb35`, cat:`Life Sciences`, title:`Basic Toxicology: How Poisons Affect the Body`, diff:`Medium`,
  qs:[
    { q:`In toxicology, what is a key principle often summarized as "the dose makes the poison"?`, ch:[`Only large amounts of any substance can ever be harmful`,`Even substances that are normally safe can become harmful at a high enough dose, while some toxic substances are only dangerous in larger amounts`,`All substances are equally toxic regardless of amount`,`Dose has no effect on toxicity`], ans:1, exp:`This classic toxicology principle means the amount of a substance matters a lot — even water can be harmful in extreme amounts, while some strong toxins can be safe in tiny amounts.` },
    { q:`What is a toxin?`, ch:[`A harmful substance produced naturally by a living organism, such as certain bacteria, plants, or animals`,`Any medicine prescribed by a doctor`,`A type of vitamin`,`A structure found only in human cells`], ans:0, exp:`A toxin specifically refers to a harmful substance made naturally by a living organism, like certain snake venoms or bacterial toxins.` },
    { q:`What is one common route by which poisons or toxic substances can enter the body?`, ch:[`Ingestion (swallowing), inhalation (breathing in), or absorption through skin`,`Only through direct injection by a doctor`,`Only through the eyes`,`Poisons cannot enter the body`], ans:0, exp:`Toxic substances can enter the body in several ways, most commonly by swallowing, breathing in, or absorbing through the skin.` },
    { q:`If someone may have been poisoned, what is a critical first step to take?`, ch:[`Wait to see if symptoms go away on their own`,`Contact poison control or emergency services right away and try to identify the substance involved`,`Immediately induce vomiting in all cases`,`Give the person any random medication`], ans:1, exp:`Getting professional guidance quickly is key, since the right response can depend heavily on what substance was involved.` },
    { q:`Why can young children be at higher risk from accidental poisoning around the house?`, ch:[`They are naturally immune to toxins`,`They are more likely to explore their environment and put things in their mouths, plus their smaller bodies may be more sensitive to lower doses`,`They never touch household chemicals`,`Poison risk does not vary by age`], ans:1, exp:`Young children often explore by tasting or touching things, and because their bodies are smaller, a given amount of a toxic substance can affect them more severely than it would an adult.` },
  ]
},
];
