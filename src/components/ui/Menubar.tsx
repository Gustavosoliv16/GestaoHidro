import { Menubar } from 'primereact/menubar';
import { InputText } from 'primereact/inputtext';
import { MenuItem } from 'primereact/menuitem';
import 'primeicons/primeicons.css'; 
import "primereact/resources/themes/saga-blue/theme.css";


export default function TemplateDemo() {
    const itemRenderer = (item) => (
        <a className="flex align-items-center p-menuitem-link">
            <span className={item.icon} />
            <span className="mx-2">{item.label}</span>
            {item.shortcut && <span className="ml-auto border-1 surface-border border-round surface-100 text-xs p-1">{item.shortcut}</span>}
        </a>
    );
    const items: MenuItem[] = [
        {
            label: 'Inicio',
            icon: 'pi pi-home'
        },
        {
            label: 'Alunos',
            icon: 'pi pi-users'
        },
        {
            label: 'Projects',
            icon: 'pi pi-search',
            
        },
        {
            label: 'Contact',
            icon: 'pi pi-envelope',
            template: itemRenderer
        }
    ];

    const start = <img alt="logo" src="../src/assets/icon.png" height="40" className="mr-2"></img>;
    const end = (
        <div className="flex align-items-center gap-2">
            <InputText placeholder="Search" type="text" className="w-8rem sm:w-auto" />
        </div>
    );

    return (
        <div className="card">
            <Menubar model={items} start={start} end={end} />
        </div>
    )
}