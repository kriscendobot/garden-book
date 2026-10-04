import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

export const palette = Object.freeze({
  paper: '#FBF8F0',
  sand: '#E8D8B9',
  brown: '#A98569',
  ink: '#6A6253',
  terracotta: '#C98267',
  moss: '#627A57',
  sage: '#9CAF88',
  fresh: '#B8CF9B',
  pink: '#D8A6A6',
  lavender: '#B9ACCC',
  gold: '#E6CF7A',
});

const leaf = (x, y, rotation = 0, fill = palette.sage, scale = 1) => `
  <path d="M0 0C-16-18-35-13-43 6C-21 12-7 9 0 0Z" fill="${fill}" transform="translate(${x} ${y}) rotate(${rotation}) scale(${scale})"/>`;

const flower = (x, y, scale = 1, fill = palette.pink) => `
  <g transform="translate(${x} ${y}) scale(${scale})" fill="${fill}" stroke="${palette.ink}" stroke-width="2">
    <circle cx="0" cy="-11" r="8"/><circle cx="10" cy="-3" r="8"/><circle cx="6" cy="9" r="8"/><circle cx="-6" cy="9" r="8"/><circle cx="-10" cy="-3" r="8"/><circle r="5" fill="${palette.gold}"/>
  </g>`;

const person = (x, y, scale = 1, color = palette.terracotta, tool = true) => `
  <g transform="translate(${x} ${y}) scale(${scale})" stroke="${palette.ink}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="0" cy="-34" r="11" fill="${palette.gold}"/>
    <path d="M-16-18L0-26L17-16L13 28H-13Z" fill="${color}"/>
    <path d="M-10 28L-16 58M10 28L18 58" fill="none"/>
    ${tool ? '<path d="M16-5L34 17M30 13L40 3" fill="none"/>' : ''}
  </g>`;

const tree = (x, y, scale = 1, crown = palette.sage) => `
  <g transform="translate(${x} ${y}) scale(${scale})" stroke="${palette.ink}" stroke-width="4" stroke-linejoin="round">
    <path d="M-8 55L-3 4L-22-18M-2 14L23-18M-4 28L-28 8" fill="none"/>
    <circle cx="-23" cy="-19" r="22" fill="${crown}"/><circle cx="23" cy="-18" r="24" fill="${palette.fresh}"/><circle cx="-28" cy="8" r="20" fill="${palette.moss}"/><circle cx="2" cy="-36" r="27" fill="${crown}"/>
  </g>`;

const bed = (x, y, width, height, fill = palette.brown) => `
  <g stroke="${palette.ink}" stroke-width="4" stroke-linejoin="round">
    <path d="M${x} ${y}l${width} -${height / 3}l0 ${height}l-${width} ${height / 3}Z" fill="${fill}"/>
    <path d="M${x} ${y}l${width} -${height / 3}" fill="none" stroke="${palette.sand}"/>
  </g>`;

const packet = (x, y, scale = 1, fill = palette.gold) => `
  <g transform="translate(${x} ${y}) scale(${scale})" stroke="${palette.ink}" stroke-width="4" stroke-linejoin="round">
    <path d="M-28-34H28L23 34H-23Z" fill="${fill}"/>
    <path d="M-28-34L0-16L28-34" fill="none"/>
    <path d="M0 19V-4M0 7C-14 5-19-5-20-14C-8-14-1-7 0 7ZM0 12C13 10 18 2 19-7C8-7 1 2 0 12Z" fill="${palette.sage}"/>
  </g>`;

const book = (x, y, width, height, fill = palette.paper) => `
  <g stroke="${palette.ink}" stroke-width="4" stroke-linejoin="round">
    <path d="M${x} ${y}Q${x + width / 4} ${y - 12} ${x + width / 2} ${y + 8}V${y + height}Q${x + width / 4} ${y + height - 18} ${x} ${y + height - 5}Z" fill="${fill}"/>
    <path d="M${x + width} ${y}Q${x + (3 * width) / 4} ${y - 12} ${x + width / 2} ${y + 8}V${y + height}Q${x + (3 * width) / 4} ${y + height - 18} ${x + width} ${y + height - 5}Z" fill="${fill}"/>
  </g>`;

const gate = (x, y, width, height, open = true) => `
  <g stroke="${palette.ink}" stroke-width="6" stroke-linejoin="round" fill="none">
    <path d="M${x} ${y + height}V${y + 34}Q${x + width / 2} ${y - 18} ${x + width} ${y + 34}V${y + height}"/>
    <path d="M${x - 14} ${y + height}H${x + width + 14}"/>
    <path d="M${open ? x + width * 0.55 : x + 8} ${y + 38}V${y + height}L${open ? x + width + 42 : x + width - 8} ${y + height - 16}V${y + 48}Z" fill="${palette.sand}"/>
  </g>`;

const gear = (x, y, radius = 26, fill = palette.gold) => {
  const teeth = Array.from({ length: 8 }, (_, index) => {
    const angle = index * 45;
    return `<rect x="-5" y="-${radius + 10}" width="10" height="18" rx="2" fill="${fill}" transform="rotate(${angle})"/>`;
  }).join('');
  return `<g transform="translate(${x} ${y})" stroke="${palette.ink}" stroke-width="4">${teeth}<circle r="${radius}" fill="${fill}"/><circle r="${radius / 2.8}" fill="${palette.paper}"/></g>`;
};

const lens = (x, y, scale = 1, fill = palette.lavender) => `
  <g transform="translate(${x} ${y}) scale(${scale})" stroke="${palette.ink}" stroke-width="5" stroke-linecap="round">
    <circle r="22" fill="${fill}" fill-opacity="0.55"/><path d="M16 16L39 39"/>
  </g>`;

const key = (x, y, scale = 1) => `
  <g transform="translate(${x} ${y}) scale(${scale})" fill="none" stroke="${palette.gold}" stroke-width="7" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="-20" r="15"/><path d="M-5 0H38M21 0V13M32 0V9"/>
  </g>`;

const lock = (x, y, scale = 1) => `
  <g transform="translate(${x} ${y}) scale(${scale})" stroke="${palette.ink}" stroke-width="5">
    <path d="M-18 0V-16A18 18 0 0136 0" fill="none" transform="translate(-9 0)"/><rect x="-27" y="0" width="54" height="43" rx="5" fill="${palette.gold}"/><circle cy="18" r="4" fill="${palette.ink}"/>
  </g>`;

const arrowHead = (x, y, direction = 'right', fill = palette.terracotta) => {
  const rotation = { right: 0, down: 90, left: 180, up: 270 }[direction];
  return `<path d="M-18-13L9 0L-18 13Z" fill="${fill}" stroke="${palette.ink}" stroke-width="3" transform="translate(${x} ${y}) rotate(${rotation})"/>`;
};

const frame = (width, height) => `
  <rect x="10" y="10" width="${width - 20}" height="${height - 20}" rx="20" fill="${palette.paper}" stroke="${palette.ink}" stroke-width="5"/>
  <rect x="24" y="24" width="${width - 48}" height="${height - 48}" rx="14" fill="none" stroke="${palette.gold}" stroke-width="3"/>
  <path d="M28 92Q70 28 132 35M${width - 28} 92Q${width - 70} 28 ${width - 132} 35M28 ${height - 92}Q70 ${height - 28} 132 ${height - 35}M${width - 28} ${height - 92}Q${width - 70} ${height - 28} ${width - 132} ${height - 35}" fill="none" stroke="${palette.moss}" stroke-width="5" stroke-linecap="round"/>
  ${leaf(82, 45, -18, palette.sage, 0.65)}${leaf(width - 82, 45, 198, palette.fresh, 0.65)}${leaf(82, height - 45, 18, palette.fresh, 0.65)}${leaf(width - 82, height - 45, 162, palette.sage, 0.65)}`;

export const illustrations = [
  {
    number: 1,
    file: 'illumination-ch1-metamorphoses.svg',
    anchor: 'ch1-chapter-1-philosophy-history-and-metamorphosis',
    role: 'Chapter opener',
    ratio: '16:10',
    title: 'The garden through its metamorphoses',
    description: 'One continuous root passes through a shepherd plot, glasshouse, supervised nursery, and distributed garden joined at a central ledger.',
    scene: () => `
      <path d="M65 485C235 410 305 505 470 450S735 490 890 408" fill="none" stroke="${palette.brown}" stroke-width="15" stroke-linecap="round"/>
      <path d="M70 475C235 400 310 495 470 440S730 480 890 398" fill="none" stroke="${palette.gold}" stroke-width="4" stroke-linecap="round"/>
      <g fill="${palette.sand}" stroke="${palette.ink}" stroke-width="5"><path d="M62 190Q155 95 248 190V430H62Z"/><path d="M272 190Q365 95 458 190V430H272Z"/><path d="M482 190Q575 95 668 190V430H482Z"/><path d="M692 190Q785 95 898 190V430H692Z"/></g>
      ${person(155, 330, 0.8)}<path d="M95 390H220" stroke="${palette.moss}" stroke-width="8"/>
      <path d="M300 382V226L365 156L430 226V382Z" fill="${palette.paper}" fill-opacity="0.6" stroke="${palette.ink}" stroke-width="5"/><path d="M365 157V382M300 226H430" stroke="${palette.sage}" stroke-width="4"/>
      ${bed(506, 330, 130, 54, palette.sage)}${person(570, 288, 0.62, palette.lavender)}<path d="M628 205h20v62h-20zM618 205l20-34 20 34z" fill="${palette.brown}" stroke="${palette.ink}" stroke-width="4"/>${flower(638, 157, 0.45, palette.gold)}
      ${book(750, 305, 90, 75, palette.gold)}<path d="M737 320C700 272 712 236 737 214M852 320C892 272 879 233 852 212" fill="none" stroke="${palette.moss}" stroke-width="6"/>${person(726, 382, 0.45)}${person(866, 382, 0.45, palette.lavender)}`,
  },
  {
    number: 2,
    file: 'illumination-ch1-bidding-market.svg',
    anchor: 'ch1-15-the-next-metamorphosis-the-bidding-market',
    role: 'Section illustration',
    ratio: '5:2',
    title: 'A market for the next plot of work',
    description: 'Gardeners offer different tools and seeds to a balance that selects the best match for a plot, while an old footrace path fades behind them.',
    scene: () => `
      <path d="M80 305C180 220 245 330 340 245" fill="none" stroke="${palette.brown}" stroke-width="7" stroke-dasharray="18 16" opacity="0.42"/>
      ${person(145, 276, 0.62, palette.pink)}${person(254, 300, 0.72, palette.lavender)}${person(355, 279, 0.64, palette.sage)}
      ${packet(145, 190, 0.52, palette.pink)}${packet(255, 195, 0.52, palette.lavender)}${packet(355, 190, 0.52, palette.gold)}
      <g stroke="${palette.ink}" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"><path d="M520 118V316M448 164H592M472 164L442 258H502ZM568 164L538 258H598Z" fill="none"/><path d="M478 316H562"/></g>
      <circle cx="520" cy="127" r="14" fill="${palette.gold}" stroke="${palette.ink}" stroke-width="4"/>
      ${bed(680, 270, 220, 75, palette.brown)}<path d="M725 245l42-50 40 50M775 245l43-74 40 74" fill="none" stroke="${palette.moss}" stroke-width="8"/>${packet(574, 219, 0.36, palette.gold)}
      <path d="M610 210C646 185 662 185 694 212" fill="none" stroke="${palette.terracotta}" stroke-width="6"/>${arrowHead(695, 212)}`,
  },
  {
    number: 3,
    file: 'illumination-ch2-shared-garden.svg',
    anchor: 'ch2-chapter-2-architecture-and-operation',
    role: 'Chapter opener',
    ratio: '3:2',
    title: 'The machinery beneath one shared garden',
    description: 'Gardeners work in separate beds and sheds while underground channels converge on one bound journal.',
    scene: () => `
      <path d="M55 330H845V515H55Z" fill="${palette.brown}" fill-opacity="0.45" stroke="${palette.ink}" stroke-width="5"/>
      <path d="M55 330H845" stroke="${palette.moss}" stroke-width="11"/>
      ${bed(95, 290, 150, 48, palette.sage)}${bed(375, 290, 150, 48, palette.fresh)}${bed(655, 290, 150, 48, palette.sage)}
      ${person(170, 245, 0.55)}${person(450, 245, 0.55, palette.lavender)}${person(730, 245, 0.55, palette.pink)}
      <g fill="${palette.sand}" stroke="${palette.ink}" stroke-width="4"><path d="M80 280V180L140 135L200 180V280Z"/><path d="M360 280V180L420 135L480 180V280Z"/><path d="M640 280V180L700 135L760 180V280Z"/></g>
      <g fill="none" stroke="${palette.gold}" stroke-width="8" stroke-linecap="round"><path d="M170 350C180 430 300 405 400 468"/><path d="M450 350V468"/><path d="M730 350C720 430 600 405 500 468"/></g>
      ${book(390, 438, 120, 70, palette.paper)}
      <g transform="translate(450 100)" fill="${palette.gold}" stroke="${palette.ink}" stroke-width="3"><path d="M0-38V38M-38 0H38M-27-27L27 27M27-27L-27 27"/><circle r="13" fill="${palette.paper}"/></g>`,
  },
  {
    number: 4,
    file: 'illumination-ch2-journal-duties.svg',
    anchor: 'ch2-21-the-journal-as-job-board-and-message-bus',
    role: 'Section illustration',
    ratio: '2:1',
    title: 'One journal, three duties',
    description: 'Three joined manuscript leaves serve as transcript, job board, and message bus, all fastened by one central clasp.',
    scene: () => `
      <g fill="${palette.sand}" stroke="${palette.ink}" stroke-width="5" stroke-linejoin="round"><path d="M76 130Q210 105 330 145V394Q205 360 76 390Z"/><path d="M335 145Q500 95 665 145V394Q500 360 335 394Z"/><path d="M670 145Q790 105 924 130V390Q795 360 670 394Z"/></g>
      <g stroke="${palette.brown}" stroke-width="5" stroke-linecap="round"><path d="M120 190H280M120 235H255M120 280H285M120 325H235"/><path d="M390 205H610M390 268H610M390 331H610"/></g>
      <circle cx="430" cy="205" r="15" fill="${palette.gold}"/><path d="M475 188v34h42v-34z" fill="${palette.sage}" stroke="${palette.ink}" stroke-width="3"/>${flower(570, 205, 0.45, palette.pink)}
      <g fill="none" stroke="${palette.moss}" stroke-width="6"><path d="M720 330C760 285 742 216 788 172M742 280L850 210M780 248L875 315"/></g>${packet(720, 330, 0.34, palette.gold)}${packet(850, 210, 0.34, palette.pink)}${packet(875, 315, 0.34, palette.lavender)}
      <rect x="475" y="342" width="50" height="64" rx="8" fill="${palette.gold}" stroke="${palette.ink}" stroke-width="5"/>${lock(500, 360, 0.32)}`,
  },
  {
    number: 5,
    file: 'illumination-ch2-deliberate-deploy.svg',
    anchor: 'ch2-26-the-deliberate-deploy',
    role: 'Section illustration',
    ratio: '5:2',
    title: 'A deliberate deploy across the fleet',
    description: 'A tested graft moves from development to two canary trees and only then to the leader, while each deployed tree keeps one settled graft.',
    scene: () => `
      <path d="M90 314H910" stroke="${palette.brown}" stroke-width="10" stroke-linecap="round"/>
      <g fill="${palette.sand}" stroke="${palette.ink}" stroke-width="5"><path d="M65 175H245V310H65Z"/><path d="M65 175L155 112L245 175"/></g>
      ${packet(155, 250, 0.58, palette.fresh)}${person(285, 280, 0.55)}
      ${tree(430, 250, 0.82, palette.sage)}${tree(590, 250, 0.82, palette.fresh)}${tree(800, 230, 1.05, palette.moss)}
      <g fill="${palette.gold}" stroke="${palette.ink}" stroke-width="3"><rect x="397" y="305" width="66" height="28" rx="6"/><rect x="557" y="305" width="66" height="28" rx="6"/><rect x="757" y="307" width="86" height="30" rx="6"/></g>
      <path d="M245 208H365M475 208H525M635 208H720" stroke="${palette.terracotta}" stroke-width="6"/>${arrowHead(365, 208)}${arrowHead(525, 208)}${arrowHead(720, 208)}
      <path d="M875 152h16v44h-16zM866 152l17-25 17 25z" fill="${palette.brown}" stroke="${palette.ink}" stroke-width="3"/>${flower(883, 120, 0.34, palette.gold)}`,
  },
  {
    number: 6,
    file: 'illumination-ch3-garden-gate.svg',
    anchor: 'ch3-chapter-3-using-the-garden',
    role: 'Chapter opener',
    ratio: '4:3',
    title: 'Speaking through the garden gate',
    description: 'A reader speaks to a liaison at the gate; the liaison relays durable work to distant gardeners and brings their questions back.',
    scene: () => `
      ${gate(285, 115, 230, 365, true)}${person(190, 400, 0.85, palette.lavender, false)}${person(395, 330, 0.83, palette.terracotta)}
      <path d="M210 273Q260 230 318 275" fill="none" stroke="${palette.pink}" stroke-width="8" stroke-linecap="round"/>
      <path d="M450 262C545 195 596 205 675 160M455 288C560 300 620 345 700 372" fill="none" stroke="${palette.moss}" stroke-width="7" stroke-linecap="round"/>
      ${packet(555, 216, 0.45, palette.gold)}${packet(610, 320, 0.42, palette.fresh)}${person(690, 165, 0.5, palette.sage)}${person(700, 390, 0.5, palette.pink)}
      <path d="M710 250Q615 235 515 270" fill="none" stroke="${palette.lavender}" stroke-width="7" stroke-dasharray="14 10"/>${arrowHead(515, 270, 'left', palette.lavender)}
      <path d="M535 335H610V418H535Z" fill="${palette.sand}" stroke="${palette.ink}" stroke-width="5"/><path d="M535 335L572 365L610 335" fill="none" stroke="${palette.ink}" stroke-width="4"/>`,
  },
  {
    number: 7,
    file: 'illumination-ch3-muster.svg',
    anchor: 'ch3-33-muster-working-the-maintainer-inbox',
    role: 'Section illustration',
    ratio: '3:1',
    title: 'Muster turns an overgrown inbox into decisions',
    description: 'Tangled message leaves are compacted into bundles, classified into baskets, and presented one basket at a time for a gardener to decide.',
    scene: () => `
      <path d="M75 275H975" stroke="${palette.brown}" stroke-width="13" stroke-linecap="round"/>
      <g fill="none" stroke="${palette.moss}" stroke-width="7"><path d="M95 235C140 95 255 285 310 135M100 115C185 280 230 92 308 224"/></g>${leaf(130, 150, -35, palette.sage, 0.7)}${leaf(220, 200, 25, palette.fresh, 0.7)}${packet(175, 230, 0.45, palette.pink)}
      <g fill="${palette.sand}" stroke="${palette.ink}" stroke-width="4"><rect x="390" y="135" width="120" height="30" rx="5"/><rect x="375" y="180" width="145" height="30" rx="5"/><rect x="395" y="225" width="115" height="30" rx="5"/></g>
      <g fill="${palette.gold}" stroke="${palette.ink}" stroke-width="5"><path d="M610 170h105l-14 92h-77z"/><path d="M745 170h105l-14 92h-77z"/></g>${packet(662, 208, 0.32, palette.fresh)}${packet(797, 208, 0.32, palette.lavender)}
      ${person(925, 240, 0.67, palette.terracotta, false)}<path d="M845 190C875 160 895 160 910 178" fill="none" stroke="${palette.ink}" stroke-width="5"/>
      <path d="M320 195H355M530 195H585M855 215H885" stroke="${palette.terracotta}" stroke-width="5"/>${arrowHead(355, 195)}${arrowHead(585, 195)}${arrowHead(885, 215)}`,
  },
  {
    number: 8,
    file: 'illumination-ch4-living-enclosure.svg',
    anchor: 'ch4-chapter-4-creating-your-own-instance',
    role: 'Chapter opener',
    ratio: '3:2',
    title: 'A garden instance as a living enclosure',
    description: 'A new walled enclosure gains a unique gate, locked credentials, worker beds, and a path connecting it to the larger garden.',
    scene: () => `
      <path d="M90 465V160H640V465Z" fill="${palette.sand}" fill-opacity="0.5" stroke="${palette.ink}" stroke-width="13" stroke-dasharray="42 8"/>
      ${gate(270, 110, 180, 355, true)}<path d="M323 122Q360 70 397 122" fill="none" stroke="${palette.gold}" stroke-width="9"/>
      ${bed(130, 330, 130, 60, palette.sage)}${bed(480, 330, 120, 60, palette.fresh)}${person(195, 295, 0.55)}${person(540, 295, 0.55, palette.lavender)}
      <path d="M120 190H230V300H120Z" fill="${palette.brown}" stroke="${palette.ink}" stroke-width="5"/>${lock(150, 225, 0.44)}${lock(205, 225, 0.44)}${lock(178, 275, 0.44)}
      <path d="M450 465C585 530 655 495 780 440" fill="none" stroke="${palette.terracotta}" stroke-width="22" stroke-linecap="round"/>
      <g transform="translate(750 330)" fill="${palette.sand}" stroke="${palette.ink}" stroke-width="4"><path d="M0 105V30L55 0L110 30V105Z"/><path d="M125 105V45L170 20L215 45V105Z"/></g>
      <g stroke="${palette.gold}" stroke-width="5"><path d="M70 100H160M70 100V190"/><circle cx="70" cy="100" r="12" fill="${palette.paper}"/></g>`,
  },
  {
    number: 9,
    file: 'illumination-ch4-container-boundary.svg',
    anchor: 'ch4-42-the-container-model',
    role: 'Section illustration',
    ratio: '4:3',
    title: 'The container boundary',
    description: 'Worker beds, services, and bot credentials remain inside a glass enclosure while human keys and private tools stay outside and unreachable.',
    scene: () => `
      <path d="M205 470V285C205 130 595 130 595 285V470Z" fill="${palette.lavender}" fill-opacity="0.18" stroke="${palette.ink}" stroke-width="9"/>
      <path d="M205 310H595" stroke="${palette.ink}" stroke-width="5" stroke-dasharray="14 10"/>
      ${bed(260, 370, 130, 50, palette.sage)}${person(325, 340, 0.5)}${gear(475, 275, 33, palette.gold)}${gear(540, 345, 25, palette.pink)}
      <path d="M420 340H485V445H420Z" fill="${palette.brown}" stroke="${palette.ink}" stroke-width="5"/>${lock(452, 370, 0.5)}
      ${key(105, 340, 0.8)}<path d="M80 420l80-92M92 430l62-15" stroke="${palette.ink}" stroke-width="8" stroke-linecap="round"/>
      <path d="M650 410h85v50h-85zM672 410v-30h41v30" fill="${palette.sand}" stroke="${palette.ink}" stroke-width="5"/>
      <rect x="565" y="370" width="60" height="100" rx="25" fill="${palette.paper}" stroke="${palette.ink}" stroke-width="5"/><path d="M580 420H610" stroke="${palette.gold}" stroke-width="8"/>`,
  },
  {
    number: 10,
    file: 'illumination-ch4-turnkey-host.svg',
    anchor: 'ch4-46-the-turnkey-path-a-disposable-aws-host',
    role: 'Section illustration',
    ratio: '16:9',
    title: 'The turnkey host arrives empty of secrets',
    description: 'A prebuilt floating garden host descends with beds and a conservatory but receives its three credentials only from a human after landing.',
    scene: () => `
      <path d="M160 135C190 75 270 86 285 132C330 95 395 125 392 170H145C130 150 140 137 160 135ZM575 115C610 60 685 75 700 125C748 88 820 120 815 165H555C542 142 552 120 575 115Z" fill="${palette.sand}" stroke="${palette.ink}" stroke-width="5"/>
      <path d="M250 170V260M685 165V260M250 260H685" fill="none" stroke="${palette.brown}" stroke-width="7" stroke-dasharray="15 10"/>
      <path d="M185 260H760L705 420H245Z" fill="${palette.brown}" stroke="${palette.ink}" stroke-width="7"/>
      ${bed(265, 310, 180, 55, palette.sage)}<path d="M510 355V245L585 190L660 245V355Z" fill="${palette.paper}" fill-opacity="0.55" stroke="${palette.ink}" stroke-width="5"/><path d="M585 190V355M510 245H660" stroke="${palette.sage}" stroke-width="4"/>
      <g fill="${palette.paper}" stroke="${palette.gold}" stroke-width="6"><path d="M705 300h34v46h-34z"/><path d="M705 350h34v46h-34z"/><path d="M660 325h34v46h-34z"/></g>
      ${person(145, 445, 0.65, palette.lavender, false)}${key(225, 390, 0.55)}${key(185, 420, 0.55)}${key(265, 420, 0.55)}
      <path d="M295 405C390 455 515 470 655 375" fill="none" stroke="${palette.moss}" stroke-width="6"/>${arrowHead(655, 375, 'right', palette.moss)}`,
  },
  {
    number: 11,
    file: 'illumination-ch5-field-guilds.svg',
    anchor: 'ch5-chapter-5-roles-reference',
    role: 'Chapter opener',
    ratio: '3:2',
    title: "Roles as the garden's field guilds",
    description: 'One generic gardener chooses an emblem and a slim operating brief from different guild alcoves for each kind of work.',
    scene: () => `
      ${person(450, 420, 1.05, palette.terracotta, false)}${book(405, 300, 90, 72, palette.gold)}
      <g fill="${palette.sand}" stroke="${palette.ink}" stroke-width="5"><path d="M70 365V195Q130 110 190 195V365Z"/><path d="M200 285V135Q260 55 320 135V285Z"/><path d="M580 285V135Q640 55 700 135V285Z"/><path d="M710 365V195Q770 110 830 195V365Z"/><path d="M330 245V110Q390 35 440 110V245Z"/><path d="M460 245V110Q510 35 570 110V245Z"/></g>
      <g stroke="${palette.ink}" stroke-width="5" fill="none"><path d="M105 310l50-75M225 240h70M370 195l35-70 30 70M485 165h60M605 205l70-45M735 290h70"/></g>
      ${gear(155, 235, 18, palette.gold)}${flower(260, 200, 0.6, palette.pink)}${lens(405, 160, 0.7)}${book(490, 130, 50, 52, palette.paper)}${key(640, 180, 0.55)}${lock(770, 235, 0.55)}
      <path d="M450 294C370 250 315 235 285 225" fill="none" stroke="${palette.terracotta}" stroke-width="7"/>${arrowHead(285, 225, 'left')}`,
  },
  {
    number: 12,
    file: 'illumination-ch5-panel-arbor.svg',
    anchor: 'ch5-54-judicial-and-panel-adjacent-roles',
    role: 'Section illustration',
    ratio: '2:1',
    title: 'The panel as a many-eyed arbor',
    description: 'Specialists inspect one manuscript through different lenses, and their findings converge through a deterministic sorting loop.',
    scene: () => `
      <path d="M145 385V210Q500 40 855 210V385" fill="none" stroke="${palette.moss}" stroke-width="18" stroke-linecap="round"/>
      ${book(405, 205, 190, 145, palette.paper)}<path d="M440 350L420 410H580L560 350" fill="${palette.brown}" stroke="${palette.ink}" stroke-width="5"/>
      ${lens(180, 250, 0.75, palette.pink)}${lens(300, 155, 0.7, palette.gold)}${lens(405, 112, 0.65, palette.fresh)}${lens(595, 112, 0.65, palette.lavender)}${lens(700, 155, 0.7, palette.gold)}${lens(820, 250, 0.75, palette.pink)}
      <g fill="none" stroke="${palette.terracotta}" stroke-width="5"><path d="M200 285C300 350 360 355 430 375"/><path d="M315 190C350 295 395 335 450 375"/><path d="M685 190C650 295 605 335 550 375"/><path d="M800 285C700 350 640 355 570 375"/></g>
      ${gear(500, 400, 30, palette.gold)}${leaf(120, 190, -30, palette.sage, 0.8)}${leaf(880, 190, 210, palette.fresh, 0.8)}`,
  },
  {
    number: 13,
    file: 'illumination-ch6-skill-cabinet.svg',
    anchor: 'ch6-chapter-6-skills-reference',
    role: 'Chapter opener',
    ratio: '3:2',
    title: 'Skills as a cabinet of reusable cultivation methods',
    description: 'A gardener selects a few procedure folios from a cabinet while gears below execute the methods that have scripted mechanisms.',
    scene: () => `
      <path d="M210 100H720V455H210Z" fill="${palette.sand}" stroke="${palette.ink}" stroke-width="7"/>
      <g fill="${palette.paper}" stroke="${palette.ink}" stroke-width="4">${Array.from({ length: 12 }, (_, index) => { const column = index % 4; const row = Math.floor(index / 4); return `<rect x="${235 + column * 115}" y="${125 + row * 86}" width="90" height="62" rx="5"/>`; }).join('')}</g>
      <g fill="${palette.gold}">${Array.from({ length: 12 }, (_, index) => { const column = index % 4; const row = Math.floor(index / 4); return `<circle cx="${280 + column * 115}" cy="${160 + row * 86}" r="6"/>`; }).join('')}</g>
      <path d="M350 211H440V287H350Z" fill="${palette.fresh}" stroke="${palette.ink}" stroke-width="5" transform="rotate(-12 395 249)"/>${book(370, 225, 74, 58, palette.paper)}
      ${person(115, 420, 0.8, palette.terracotta)}${packet(138, 300, 0.45, palette.lavender)}
      ${gear(345, 465, 27, palette.gold)}${gear(430, 465, 34, palette.pink)}${gear(525, 465, 27, palette.fresh)}${gear(610, 465, 34, palette.gold)}
      <path d="M180 340C230 285 290 265 350 250" fill="none" stroke="${palette.terracotta}" stroke-width="6"/>${arrowHead(350, 250)}`,
  },
  {
    number: 14,
    file: 'illumination-ch6-guarded-edge.svg',
    anchor: 'ch6-610-security-and-trust-surfaces',
    role: 'Section illustration',
    ratio: '5:2',
    title: 'The guarded edge of the garden',
    description: 'An incoming scroll is classified before entry, and an outgoing note has its destination checked before leaving through a second gate.',
    scene: () => `
      <path d="M390 70V330M610 70V330" stroke="${palette.ink}" stroke-width="32" stroke-dasharray="36 10"/>
      ${gate(385, 125, 105, 205, true)}${gate(510, 125, 105, 205, true)}
      <path d="M70 180C175 135 240 260 345 215" fill="none" stroke="${palette.brown}" stroke-width="11" stroke-dasharray="20 14"/>
      ${book(110, 155, 110, 75, palette.paper)}${lens(300, 195, 0.95, palette.lavender)}${person(365, 285, 0.52, palette.sage)}
      ${person(660, 285, 0.52, palette.terracotta)}${packet(715, 205, 0.52, palette.gold)}
      <path d="M755 210H910" stroke="${palette.terracotta}" stroke-width="7" stroke-dasharray="18 10"/>${arrowHead(910, 210)}
      <rect x="650" y="115" width="105" height="45" rx="8" fill="${palette.paper}" stroke="${palette.ink}" stroke-width="4"/><path d="M670 137h65" stroke="${palette.gold}" stroke-width="8"/>
      <path d="M400 90C350 80 345 130 370 145M600 90C650 80 655 130 630 145" fill="none" stroke="${palette.moss}" stroke-width="7"/>`,
  },
  {
    number: 15,
    file: 'illumination-ch7-named-paths.svg',
    anchor: 'ch7-chapter-7-procedures-and-workflows',
    role: 'Chapter opener',
    ratio: '16:10',
    title: 'Work follows named paths',
    description: 'An itinerary map uses post-mounted signboards to mark a review loop, branching sequence, route waiting at a gate, and river crossing for different kinds of work.',
    scene: () => `
      <path d="M85 420C180 345 140 200 260 175C390 150 360 410 245 390C130 370 165 220 285 228" fill="none" stroke="${palette.terracotta}" stroke-width="14" stroke-linecap="round"/>
      <path d="M340 450C410 355 470 345 485 250M485 250L415 165M485 250L565 150" fill="none" stroke="${palette.gold}" stroke-width="14" stroke-linecap="round"/>
      <path d="M585 455V290" stroke="${palette.moss}" stroke-width="14" stroke-linecap="round"/>${gate(540, 175, 90, 115, false)}
      <path d="M700 95C650 170 745 240 690 320S720 470 835 490" fill="none" stroke="${palette.lavender}" stroke-width="75" opacity="0.6"/>
      <path d="M650 300H770" stroke="${palette.brown}" stroke-width="15"/><path d="M665 300l25-38M710 300l25-38M755 300l25-38" stroke="${palette.ink}" stroke-width="5"/>
      <g fill="${palette.sand}" stroke="${palette.ink}" stroke-width="4" stroke-linejoin="round"><path d="M250 112h92v48h-92l-15-24zM280 160v58h15v-58z"/><path d="M430 318h98l15 24-15 24h-98zM468 366v62h15v-62z"/><path d="M770 370h92v48h-92l-15-24zM800 418v58h15v-58z"/></g>
      ${person(180, 285, 0.4)}${person(455, 220, 0.4, palette.pink)}${person(690, 360, 0.4, palette.sage)}`,
  },
  {
    number: 16,
    file: 'illumination-ch7-gauntlet.svg',
    anchor: 'ch7-72-the-gauntlet-end-to-end',
    role: 'Section illustration',
    ratio: '3:1',
    title: 'The gauntlet tends one artifact through repeated review',
    description: 'One potted espalier moves through root inspection, pruning, specialist review, repair, and an open gate, looping from review back to repair when needed.',
    scene: () => `
      <path d="M75 245C180 100 305 110 385 230S600 335 690 205S860 120 980 220" fill="none" stroke="${palette.moss}" stroke-width="10" stroke-linecap="round"/>
      <g transform="translate(100 195)"><path d="M-35 20H35L26 80H-26Z" fill="${palette.terracotta}" stroke="${palette.ink}" stroke-width="5"/><path d="M0 20V-50M0-20H-30M0-5H35" stroke="${palette.moss}" stroke-width="7"/></g>
      ${lens(260, 155, 0.75, palette.lavender)}<path d="M380 135l-25 65m25-65l35 60" stroke="${palette.ink}" stroke-width="7"/><circle cx="380" cy="135" r="9" fill="${palette.gold}"/>
      <path d="M485 225V135Q555 55 625 135V225" fill="none" stroke="${palette.moss}" stroke-width="13"/>${lens(520, 155, 0.55, palette.pink)}${lens(590, 155, 0.55, palette.gold)}
      ${person(735, 235, 0.55, palette.sage)}${gate(870, 95, 90, 165, true)}
      <path d="M605 245C620 330 770 320 760 245" fill="none" stroke="${palette.terracotta}" stroke-width="7" stroke-dasharray="15 9"/>${arrowHead(755, 245, 'up')}
      ${arrowHead(205, 140)}${arrowHead(445, 190)}${arrowHead(680, 232)}${arrowHead(840, 175)}`,
  },
  {
    number: 17,
    file: 'illumination-ch7-orchestration.svg',
    anchor: 'ch7-74-orchestration',
    role: 'Section illustration',
    ratio: '2:1',
    title: 'Orchestration writes the whole sequence down',
    description: 'A planting plan records serial and parallel child plots, stop and continue policies, and one measured water budget before work begins.',
    scene: () => `
      <path d="M250 80H900V420H250Z" fill="${palette.sand}" stroke="${palette.ink}" stroke-width="6"/>
      <g stroke="${palette.brown}" stroke-width="4"><path d="M300 145H760M300 220H760M300 295H760M300 370H760"/><path d="M410 110V395M560 110V395M710 110V395"/></g>
      ${packet(350, 145, 0.4, palette.gold)}${packet(485, 220, 0.4, palette.fresh)}${packet(630, 220, 0.4, palette.pink)}${packet(485, 295, 0.4, palette.lavender)}${packet(630, 295, 0.4, palette.gold)}${packet(780, 370, 0.4, palette.sage)}
      <path d="M350 180V205H485M525 220H590M665 220L760 260V340" fill="none" stroke="${palette.moss}" stroke-width="6"/>
      <path d="M790 130h60v60h-60z" fill="${palette.terracotta}" stroke="${palette.ink}" stroke-width="5"/><path d="M804 144l32 32m0-32l-32 32" stroke="${palette.paper}" stroke-width="7"/>
      <path d="M70 150H190V360H70Z" fill="${palette.lavender}" fill-opacity="0.5" stroke="${palette.ink}" stroke-width="6"/><path d="M70 225H190M95 125H165" stroke="${palette.ink}" stroke-width="5"/><path d="M190 320C225 320 235 320 270 345" fill="none" stroke="${palette.lavender}" stroke-width="9"/>${arrowHead(270, 345, 'right', palette.lavender)}${person(155, 390, 0.5)}`,
  },
  {
    number: 18,
    file: 'illumination-ch7-ferry.svg',
    anchor: 'ch7-76-the-ferry',
    role: 'Section illustration',
    ratio: '5:2',
    title: 'The ferry crosses an identity boundary',
    description: 'Human-authorized work crosses by ferry from the bot-owned garden to the upstream orchard with a temporary identity change.',
    scene: () => `
      <path d="M60 290H300M700 290H940" stroke="${palette.moss}" stroke-width="18"/>
      <path d="M300 250C390 200 455 305 530 245S650 210 700 250V350H300Z" fill="${palette.lavender}" fill-opacity="0.62" stroke="${palette.ink}" stroke-width="5"/>
      <path d="M415 270H610L575 330H450Z" fill="${palette.brown}" stroke="${palette.ink}" stroke-width="6"/><path d="M505 270V175L570 235H505" fill="${palette.sand}" stroke="${palette.ink}" stroke-width="5"/>
      ${person(505, 270, 0.5, palette.terracotta, false)}${packet(555, 278, 0.4, palette.fresh)}
      ${person(190, 255, 0.62, palette.lavender, false)}${key(278, 210, 0.52)}
      <path d="M270 235C325 185 375 190 420 235" fill="none" stroke="${palette.gold}" stroke-width="6" stroke-dasharray="14 9"/>${arrowHead(420, 235, 'right', palette.gold)}
      ${tree(780, 230, 0.8, palette.sage)}${tree(875, 235, 0.72, palette.fresh)}
      <path d="M275 300V335M725 300V335" stroke="${palette.ink}" stroke-width="7"/><path d="M90 315H260M740 315H915" stroke="${palette.brown}" stroke-width="6" stroke-dasharray="18 10"/>`,
  },
  {
    number: 19,
    file: 'illumination-ch8-feedback-loops.svg',
    anchor: 'ch8-chapter-8-cybernetics-and-budgeting',
    role: 'Chapter opener',
    ratio: '3:2',
    title: 'The garden as a set of feedback loops',
    description: 'A fleet-scale reservoir loop regulates a broad bed while a smaller gauge, drip line, and return root close a second loop around one seedling.',
    scene: () => `
      <path d="M90 140H280V375H90Z" fill="${palette.lavender}" fill-opacity="0.45" stroke="${palette.ink}" stroke-width="6"/><path d="M105 235H265M105 300H265" stroke="${palette.paper}" stroke-width="7"/>
      <g fill="${palette.gold}" stroke="${palette.ink}" stroke-width="5"><circle cx="355" cy="185" r="62"/><circle cx="355" cy="185" r="10" fill="${palette.paper}"/><path d="M355 185l32-30"/></g>
      <path d="M280 270H510V350H690" fill="none" stroke="${palette.lavender}" stroke-width="15" stroke-linecap="round"/>
      <path d="M445 245V295M425 255l40 30M465 255l-40 30" stroke="${palette.ink}" stroke-width="7"/>
      ${bed(610, 335, 190, 75, palette.brown)}${flower(675, 305, 0.55, palette.pink)}${flower(745, 280, 0.55, palette.gold)}
      <path d="M715 415C690 500 520 520 420 430S240 455 190 385" fill="none" stroke="${palette.moss}" stroke-width="10" stroke-dasharray="16 10"/>
      ${gear(520, 205, 38, palette.terracotta)}<path d="M415 185H475M560 230L595 310" stroke="${palette.terracotta}" stroke-width="7"/>${arrowHead(475, 185)}${arrowHead(595, 310, 'down')}
      <g fill="${palette.ink}"><circle cx="185" cy="180" r="7"/><circle cx="215" cy="180" r="7"/><circle cx="245" cy="180" r="7"/></g>
      <g stroke="${palette.ink}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"><circle cx="725" cy="155" r="27" fill="${palette.gold}"/><path d="M725 155l13-12"/><path d="M752 155H795V198" fill="none" stroke="${palette.lavender}" stroke-width="8"/><path d="M784 195l11 16 11-16" fill="${palette.lavender}"/></g>
      ${bed(690, 220, 125, 42, palette.sage).trimStart()}<path d="M752 223v-29M752 205c-15-2-21-12-21-23 12 0 20 7 21 23zm0 5c13-3 19-11 19-21-11 0-18 7-19 21z" fill="${palette.fresh}" stroke="${palette.ink}" stroke-width="3"/>
      <path d="M765 270C840 270 842 130 760 130" fill="none" stroke="${palette.moss}" stroke-width="7" stroke-dasharray="11 8"/>${arrowHead(760, 130, 'left', palette.moss)}`,
  },
  {
    number: 20,
    file: 'illumination-ch8-cybernetic-loop.svg',
    anchor: 'ch8-81-why-cybernetics',
    role: 'Section illustration',
    ratio: '1:1',
    title: 'Cybernetics begins with the loop, not the ledger',
    description: 'A gauge measures a cistern, a gardener adjusts a valve, water changes the bed, and a return channel closes the causal loop.',
    scene: () => `
      <circle cx="350" cy="350" r="260" fill="${palette.sand}" fill-opacity="0.42" stroke="${palette.gold}" stroke-width="7"/>
      <path d="M125 190H300V360H125Z" fill="${palette.lavender}" fill-opacity="0.5" stroke="${palette.ink}" stroke-width="6"/><path d="M140 270H285" stroke="${palette.paper}" stroke-width="7"/>
      <circle cx="225" cy="170" r="52" fill="${palette.gold}" stroke="${palette.ink}" stroke-width="5"/><path d="M225 170l22-23" stroke="${palette.ink}" stroke-width="6"/>
      <path d="M300 300H455V385" fill="none" stroke="${palette.lavender}" stroke-width="14"/>
      <path d="M390 275V325M370 285l40 30M410 285l-40 30" stroke="${palette.ink}" stroke-width="7"/>
      ${person(400, 240, 0.5, palette.terracotta)}${bed(420, 390, 150, 65, palette.brown)}${flower(470, 355, 0.5, palette.pink)}${flower(525, 345, 0.5, palette.gold)}
      <path d="M510 460C480 555 275 565 210 400" fill="none" stroke="${palette.moss}" stroke-width="10" stroke-dasharray="16 10"/>${arrowHead(210, 400, 'up', palette.moss)}
      <path d="M155 240h35v40h-35z" fill="${palette.terracotta}" stroke="${palette.ink}" stroke-width="4"/><path d="M250 340h40v25h-40" fill="none" stroke="${palette.ink}" stroke-width="6"/>`,
  },
  {
    number: 21,
    file: 'illumination-ch8-bounded-pie.svg',
    anchor: 'ch8-86-per-orchestration-budgets-a-bounded-pie',
    role: 'Section illustration',
    ratio: '4:3',
    title: 'A bounded pie for an orchestration',
    description: 'A finite seed bowl admits serial beds in a measured round garden; later gates stay closed when seeds run out or the measuring scoop is absent.',
    scene: () => `
      <circle cx="455" cy="305" r="205" fill="${palette.sand}" stroke="${palette.ink}" stroke-width="7"/>
      <path d="M455 100V510M250 305H660M310 160L600 450M600 160L310 450" stroke="${palette.brown}" stroke-width="5"/>
      <path d="M95 175Q180 125 265 175L235 320H125Z" fill="${palette.gold}" stroke="${palette.ink}" stroke-width="6"/><g fill="${palette.brown}">${Array.from({ length: 18 }, (_, index) => `<circle cx="${135 + (index % 6) * 20}" cy="${205 + Math.floor(index / 6) * 25}" r="6"/>`).join('')}</g>
      ${person(180, 420, 0.65, palette.terracotta)}<path d="M225 345l90-55" stroke="${palette.ink}" stroke-width="11" stroke-linecap="round"/><path d="M295 270q35-15 45 15l-25 28z" fill="${palette.sand}" stroke="${palette.ink}" stroke-width="5"/>
      <g stroke="${palette.moss}" stroke-width="7"><path d="M350 305H420"/><path d="M455 205V275"/><path d="M490 305H560"/></g>${arrowHead(420, 305, 'right', palette.moss)}${arrowHead(455, 275, 'down', palette.moss)}${arrowHead(560, 305, 'right', palette.moss)}
      ${gate(660, 180, 80, 170, false)}<path d="M725 400h45v70h-45z" fill="${palette.paper}" stroke="${palette.ink}" stroke-width="5"/><path d="M735 420l25 30m0-30l-25 30" stroke="${palette.terracotta}" stroke-width="6"/>`,
  },
  {
    number: 22,
    file: 'illumination-ch9-hanging-library.svg',
    anchor: 'ch9-chapter-9-the-library-and-how-it-spends-context',
    role: 'Chapter opener',
    ratio: '4:5',
    title: 'A library grown for retrieval',
    description: 'Layered topic and source terraces let a reader lower one small relevant basket instead of harvesting the entire hanging library.',
    scene: () => `
      <path d="M120 120H680L630 270H170ZM180 305H620L580 440H220ZM240 475H560L530 600H270Z" fill="${palette.sand}" stroke="${palette.ink}" stroke-width="7"/>
      <g fill="${palette.terracotta}" stroke="${palette.ink}" stroke-width="3">${Array.from({ length: 15 }, (_, index) => { const row = Math.floor(index / 5); const column = index % 5; const start = [205, 235, 280][row]; const step = [82, 82, 52][row]; return `<rect x="${start + column * step}" y="${170 + row * 170}" width="42" height="70" rx="3"/>`; }).join('')}</g>
      <g fill="none" stroke="${palette.moss}" stroke-width="7"><path d="M155 245C80 310 160 390 95 460S150 610 95 700"/><path d="M645 245C720 310 640 390 705 460S650 610 705 700"/></g>${leaf(120, 350, -60, palette.sage, 0.7)}${leaf(680, 350, 240, palette.fresh, 0.7)}${leaf(120, 560, -40, palette.fresh, 0.7)}${leaf(680, 560, 220, palette.sage, 0.7)}
      <path d="M400 95V640" stroke="${palette.brown}" stroke-width="6" stroke-dasharray="12 9"/><circle cx="400" cy="120" r="22" fill="${palette.gold}" stroke="${palette.ink}" stroke-width="5"/>
      <path d="M345 625H455L435 710H365Z" fill="${palette.gold}" stroke="${palette.ink}" stroke-width="6"/>${book(372, 640, 56, 45, palette.paper)}
      ${person(400, 835, 0.95, palette.terracotta, false)}<path d="M430 725V765" stroke="${palette.brown}" stroke-width="7"/>`,
  },
  {
    number: 23,
    file: 'illumination-ch9-three-indexes.svg',
    anchor: 'ch9-92-what-it-looks-like-on-disk',
    role: 'Section illustration',
    ratio: '4:3',
    title: 'Three indexes around the content itself',
    description: 'An archival chest, a row of planted topic plots, and keyword stepping-stones follow three distinct routes to section-sized folios, where tied pruning tags mark material for maintenance.',
    scene: () => `
      <path d="M320 265C260 230 220 190 178 152" fill="none" stroke="${palette.brown}" stroke-width="12" stroke-linecap="round"/>
      <path d="M480 265C535 220 585 190 625 155" fill="none" stroke="${palette.moss}" stroke-width="14" stroke-linecap="round"/>
      <path d="M356 378C330 420 300 450 268 478" fill="none" stroke="${palette.gold}" stroke-width="5" stroke-dasharray="12 10"/>
      ${book(305, 235, 190, 150, palette.paper)}
      <g stroke="${palette.ink}" stroke-width="5" stroke-linejoin="round"><path d="M75 95H205V180H75Z" fill="${palette.sand}"/><path d="M65 95h150l-20-28H85z" fill="${palette.brown}"/><path d="M127 120h26v24h-26z" fill="${palette.gold}"/></g>
      <g stroke="${palette.ink}" stroke-width="4" stroke-linejoin="round">${bed(555, 120, 62, 28, palette.sage)}${bed(630, 108, 62, 28, palette.fresh)}${bed(705, 96, 48, 28, palette.sage)}<path d="M585 111v-24m0 13c-12-2-17-10-17-18 10 0 16 6 17 18zm73-3v-26m0 14c13-2 18-10 18-19-10 1-17 7-18 19zM729 87v-22" fill="${palette.fresh}"/></g>
      <g fill="${palette.gold}" stroke="${palette.ink}" stroke-width="4"><ellipse cx="245" cy="505" rx="32" ry="15"/><ellipse cx="302" cy="455" rx="28" ry="14"/><ellipse cx="340" cy="413" rx="24" ry="12"/></g>
      <g fill="${palette.terracotta}" stroke="${palette.ink}" stroke-width="3" stroke-linejoin="round"><path d="M295 225h48l10 20-10 20h-48z"/><path d="M457 220h48v40h-48l-10-20z"/><path d="M373 379h54l8 18-8 18h-54z"/></g>
      <path d="M318 225v-22M481 220v-22M400 379v-23" stroke="${palette.brown}" stroke-width="4"/><circle cx="318" cy="201" r="5" fill="${palette.brown}"/><circle cx="481" cy="196" r="5" fill="${palette.brown}"/><circle cx="400" cy="354" r="5" fill="${palette.brown}"/>
      ${flower(105, 250, 0.45, palette.pink)}${flower(685, 285, 0.45, palette.lavender)}${flower(475, 500, 0.45, palette.gold)}`,
  },
  {
    number: 24,
    file: 'illumination-ch9-reading-basket.svg',
    anchor: 'ch9-96-why-it-is-shaped-this-way-the-context-economy',
    role: 'Section illustration',
    ratio: '2:1',
    title: 'The context window is a reading basket',
    description: 'A reader stands by a finite basket and follows post-mounted signboards through a branching archive, choosing whether an abstract is sufficient or a deeper path is needed.',
    scene: () => `
      <path d="M90 260H350M350 260C440 250 430 150 520 135M350 260C440 280 430 365 520 375M520 135C625 130 650 95 750 90M520 375C625 385 650 420 750 425" fill="none" stroke="${palette.moss}" stroke-width="13" stroke-linecap="round"/>
      <g fill="${palette.sand}" stroke="${palette.ink}" stroke-width="5" stroke-linejoin="round"><path d="M285 198h95l15 25-15 25h-95zM320 248v72h17v-72z"/><path d="M445 92h95l15 24-15 24h-95zM480 140v66h17v-66z"/><path d="M445 335h95l15 24-15 24h-95zM480 383v66h17v-66z"/></g>
      <g fill="${palette.brown}" opacity="0.55">${Array.from({ length: 12 }, (_, index) => `<rect x="${620 + (index % 4) * 75}" y="${135 + Math.floor(index / 4) * 65}" width="50" height="45" rx="4"/>`).join('')}</g>
      <path d="M115 305Q170 280 225 305L210 370H130Z" fill="${palette.gold}" stroke="${palette.ink}" stroke-width="5"/>${leaf(155, 315, -45, palette.fresh, 0.55)}${leaf(195, 328, -135, palette.sage, 0.55)}${person(250, 315, 0.68, palette.terracotta, false)}
      <path d="M375 235l36 25-36 25z" fill="${palette.terracotta}" stroke="${palette.ink}" stroke-width="4"/><path d="M425 130h40M425 380h40" stroke="${palette.gold}" stroke-width="8"/>`,
  },
  {
    number: 25,
    file: 'illumination-ch10-inference-tiers.svg',
    anchor: 'ch10-chapter-10-inference-tiers-reference',
    role: 'Chapter opener',
    ratio: '3:2',
    title: 'Inference tiers as matching ladders, not a hierarchy of workers',
    description: 'Four increasingly demanding plants occupy ascending terraces, while three provider-bound ladders each begin at an attached guild emblem; role floors and fallback remain separate routes.',
    scene: () => `
      <path d="M95 465H270V375H430V285H590V195H805V465Z" fill="${palette.sand}" stroke="${palette.ink}" stroke-width="7"/>
      <g stroke="${palette.ink}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"><path d="M185 446v-45m0 20c-19-2-27-14-27-28 16 1 26 10 27 28z" fill="${palette.fresh}"/><path d="M350 356v-52m0 23c-21-3-30-16-30-31 18 1 28 11 30 31zm0 8c20-3 28-14 28-29-17 1-27 11-28 29z" fill="${palette.sage}"/><path d="M510 266v-60m0 28c-22-4-31-18-31-34 18 1 29 12 31 34zm0 8c22-4 31-17 31-33-18 1-29 12-31 33z" fill="${palette.moss}"/>${flower(510, 197, 0.38, palette.gold)}<path d="M690 177v-68m0 31l-35-25m35 10l32-27m-32 49l-38 20m38-8l39 16" fill="none" stroke="${palette.moss}" stroke-width="7"/>${flower(655, 112, 0.34, palette.pink)}${flower(723, 95, 0.34, palette.gold)}${flower(650, 168, 0.32, palette.lavender)}${flower(730, 177, 0.32, palette.pink)}</g>
      <g fill="none" stroke="${palette.brown}" stroke-width="8"><path d="M135 500L310 325M330 500L500 240M535 500L690 155"/></g>
      <g stroke="${palette.ink}" stroke-width="4">${Array.from({ length: 7 }, (_, index) => `<path d="M${155 + index * 22} ${480 - index * 22}l42 42"/>`).join('')}${Array.from({ length: 8 }, (_, index) => `<path d="M${350 + index * 21} ${480 - index * 32}l43 24"/>`).join('')}${Array.from({ length: 9 }, (_, index) => `<path d="M${555 + index * 17} ${478 - index * 38}l42 19"/>`).join('')}</g>
      <path d="M610 455C735 420 640 325 760 285" fill="none" stroke="${palette.terracotta}" stroke-width="11" stroke-dasharray="17 10"/>${arrowHead(760, 285, 'up')}
      <path d="M300 348H585" stroke="${palette.gold}" stroke-width="11"/><path d="M300 325v48M585 325v48" stroke="${palette.ink}" stroke-width="7"/>
      <g fill="${palette.lavender}" stroke="${palette.ink}" stroke-width="4"><circle cx="135" cy="500" r="24"/><path d="M330 476l24 24-24 24-24-24z"/><rect x="511" y="476" width="48" height="48" rx="7"/></g>`,
  },
];

export const renderIllustration = illustration => {
  const prefix = illustration.file.replace(/\.svg$/u, '');
  const [width, height] = illustration.ratio === '16:10'
    ? [960, 600]
    : illustration.ratio === '5:2'
      ? [1000, 400]
      : illustration.ratio === '3:2'
        ? [900, 600]
        : illustration.ratio === '2:1'
          ? [1000, 500]
          : illustration.ratio === '4:3'
            ? [800, 600]
            : illustration.ratio === '3:1'
              ? [1050, 350]
              : illustration.ratio === '16:9'
                ? [960, 540]
                : illustration.ratio === '1:1'
                  ? [700, 700]
                  : [800, 1000];
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="${prefix}-title ${prefix}-description">
  <title id="${prefix}-title">${illustration.title}</title>
  <desc id="${prefix}-description">${illustration.description}</desc>${frame(width, height)}${illustration.scene()}
</svg>
`;
};

export const generateIllustrations = async directory => {
  await mkdir(directory, { recursive: true });
  await Promise.all(
    illustrations.map(illustration =>
      writeFile(
        resolve(directory, illustration.file),
        renderIllustration(illustration),
        'utf8',
      ),
    ),
  );
};

const modulePath = fileURLToPath(import.meta.url);
if (process.argv[1] && resolve(process.argv[1]) === modulePath) {
  await generateIllustrations(fileURLToPath(new URL('.', import.meta.url)));
}
