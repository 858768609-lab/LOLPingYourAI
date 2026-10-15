using System;
using System.Collections.Generic;
using System.Runtime.InteropServices;
using System.Text;
using System.Web.Script.Serialization;

class DesktopHelper {
    [StructLayout(LayoutKind.Sequential)] struct Rect { public int Left, Top, Right, Bottom; }
    [StructLayout(LayoutKind.Sequential)] struct Point { public int X, Y; }
    [StructLayout(LayoutKind.Sequential)] struct Input { public uint type; public InputUnion data; }
    [StructLayout(LayoutKind.Explicit)] struct InputUnion { [FieldOffset(0)] public Keyboard keyboard; [FieldOffset(0)] public Mouse mouse; }
    [StructLayout(LayoutKind.Sequential)] struct Keyboard { public ushort vk, scan; public uint flags, time; public UIntPtr extra; }
    [StructLayout(LayoutKind.Sequential)] struct Mouse { public int dx, dy; public uint mouseData, flags, time; public UIntPtr extra; }
    delegate bool EnumProc(IntPtr h, IntPtr p);
    [DllImport("user32.dll")] static extern bool EnumWindows(EnumProc f, IntPtr p);
    [DllImport("user32.dll")] static extern bool IsWindowVisible(IntPtr h);
    [DllImport("user32.dll")] static extern bool IsIconic(IntPtr h);
    [DllImport("user32.dll")] static extern bool GetWindowRect(IntPtr h, out Rect r);
    [DllImport("user32.dll", EntryPoint="GetWindowLongW")] static extern int GetWindowLong(IntPtr h, int index);
    [DllImport("dwmapi.dll")] static extern int DwmGetWindowAttribute(IntPtr h, int attribute, out int value, int size);
    [DllImport("user32.dll")] static extern bool GetLayeredWindowAttributes(IntPtr h, out uint color, out byte alpha, out uint flags);
    [DllImport("user32.dll", CharSet=CharSet.Unicode)] static extern int GetWindowText(IntPtr h, StringBuilder text, int count);
    [DllImport("user32.dll")] static extern uint GetWindowThreadProcessId(IntPtr h, out uint pid);
    [DllImport("user32.dll")] static extern bool SetForegroundWindow(IntPtr h);
    [DllImport("user32.dll")] static extern IntPtr GetForegroundWindow();
    [DllImport("user32.dll")] static extern bool SetCursorPos(int x, int y);
    [DllImport("user32.dll")] static extern bool GetCursorPos(out Point p);
    [DllImport("user32.dll")] static extern bool MoveWindow(IntPtr h, int x, int y, int width, int height, bool repaint);
    [DllImport("user32.dll")] static extern uint SendInput(uint count, Input[] input, int size);
    [DllImport("user32.dll")] static extern bool SetProcessDpiAwarenessContext(IntPtr value);
    [DllImport("user32.dll")] static extern IntPtr OpenInputDesktop(uint flags, bool inherit, uint access);
    [DllImport("user32.dll")] static extern bool CloseDesktop(IntPtr h);
    static JavaScriptSerializer json = new JavaScriptSerializer();
    static double N(Dictionary<string,object> d, string key) { return d.ContainsKey(key) ? Convert.ToDouble(d[key]) : 0; }
    static string S(Dictionary<string,object> d, string key) { return d.ContainsKey(key) ? Convert.ToString(d[key]) : ""; }
    static Dictionary<string,object> Bounds(Rect r) { return new Dictionary<string,object>{{"x",r.Left},{"y",r.Top},{"width",r.Right-r.Left},{"height",r.Bottom-r.Top}}; }
    static bool CanPointAt(IntPtr h) {
        // EnumWindows can include shell-cloaked WinUI windows even when
        // IsWindowVisible is true; they must not steal the window under a ping.
        int style=GetWindowLong(h,-20);
        if(IsIconic(h) || (style & 0x20)!=0)return false;
        uint color,flags; byte alpha;
        // Some overlays use zero global alpha without WS_EX_TRANSPARENT.
        if((style & 0x80000)!=0 && GetLayeredWindowAttributes(h,out color,out alpha,out flags) && (flags & 2)!=0 && alpha==0)return false;
        int cloaked;
        return DwmGetWindowAttribute(h,14,out cloaked,4)!=0 || cloaked==0;
    }
    static List<Dictionary<string,object>> Windows(int exclude) {
        var result = new List<Dictionary<string,object>>();
        EnumWindows((h,p) => { uint pid; GetWindowThreadProcessId(h,out pid); Rect r; var title=new StringBuilder(1024); GetWindowText(h,title,1024);
            if(pid!=(uint)exclude && IsWindowVisible(h) && title.Length>0 && GetWindowRect(h,out r) && r.Right>r.Left && r.Bottom>r.Top) {
                string app=""; try { app=System.Diagnostics.Process.GetProcessById((int)pid).ProcessName; } catch {}
                result.Add(new Dictionary<string,object>{{"id",h.ToInt64().ToString()},{"pid",pid},{"app",app},{"title",title.ToString()},{"bounds",Bounds(r)}});
            } return true; },IntPtr.Zero); return result;
    }
    static void Send(Input input) { if(SendInput(1,new[]{input},Marshal.SizeOf(typeof(Input)))!=1) throw new Exception("Input was rejected; target may require elevated privileges"); }
    static void Key(ushort vk, ushort scan, uint flags) { Send(new Input{type=1,data=new InputUnion{keyboard=new Keyboard{vk=vk,scan=scan,flags=flags}}}); }
    static void Main(string[] argv) {
        try {
            Console.InputEncoding = new UTF8Encoding(false);
            Console.OutputEncoding = new UTF8Encoding(false);
            try { SetProcessDpiAwarenessContext(new IntPtr(-4)); } catch {}
            var args=json.Deserialize<Dictionary<string,object>>(Console.In.ReadToEnd()) ?? new Dictionary<string,object>();
            string op=argv.Length>0?argv[0]:"doctor"; object result=new {ok=true};
            var desk=OpenInputDesktop(0,false,0x0100); bool locked=desk==IntPtr.Zero; if(!locked)CloseDesktop(desk);
            if(op=="doctor") result=new {accessibility=!locked,screenRecording=!locked,locked=locked,platform="win32"};
            else if(op=="cursor") { Point p; GetCursorPos(out p);result=new{x=p.X,y=p.Y}; }
            else {
                var windows=Windows((int)N(args,"excludePid"));
                if(op=="windows") result=windows;
                else {
                    if(locked)throw new Exception("Desktop is locked");
                    Dictionary<string,object> target=null;
                    foreach(var w in windows) { var b=(Dictionary<string,object>)w["bounds"];
                        // A click-through overlay (including a second lolPing instance) is not the
                        // window the user pointed at. Keep it in the windows/resolve APIs, but look
                        // through WS_EX_TRANSPARENT during point-based target selection.
                        if(op=="target" && !CanPointAt(new IntPtr(long.Parse(S(w,"id")))))continue;
                        if(op=="target" ? N(args,"x")>=N(b,"x") && N(args,"x")<N(b,"x")+N(b,"width") && N(args,"y")>=N(b,"y") && N(args,"y")<N(b,"y")+N(b,"height") : S(w,"id")==S(args,"id") && N(w,"pid")==N(args,"pid")) { target=w;break; }
                    }
                    if(target==null)throw new Exception("Target window closed or changed");
                    if(op=="target" || op=="resolve")result=target;
                    else {
                        var h=new IntPtr(long.Parse(S(target,"id"))); SetForegroundWindow(h);
                        if(GetForegroundWindow()!=h)throw new Exception("Windows did not grant foreground control");
                        if(op=="resize") { var b=(Dictionary<string,object>)args["bounds"]; if(!MoveWindow(h,(int)N(b,"x"),(int)N(b,"y"),(int)N(b,"width"),(int)N(b,"height"),true))throw new Exception("Cannot resize window"); }
                        else if(op=="click" || op=="scroll") {
                            var b=(Dictionary<string,object>)target["bounds"]; int x=(int)N(args,"x"),y=(int)N(args,"y");
                            if(x<N(b,"x") || x>=N(b,"x")+N(b,"width") || y<N(b,"y") || y>=N(b,"y")+N(b,"height"))throw new Exception("Point outside target");
                            SetCursorPos(x,y);
                            if(op=="scroll")Send(new Input{type=0,data=new InputUnion{mouse=new Mouse{flags=0x800,mouseData=unchecked((uint)(int)N(args,"delta"))}}});
                            else { bool right=S(args,"button")=="right"; foreach(uint flag in right?new uint[]{8,16}:new uint[]{2,4})Send(new Input{type=0,data=new InputUnion{mouse=new Mouse{flags=flag}}}); }
                        } else if(op=="type") { string text=S(args,"text");if(text.Length>10000)throw new Exception("Text too long");foreach(char c in text){Key(0,c,4);Key(0,c,6);} }
                        else if(op=="key") {
                            string[] parts=S(args,"key").ToLowerInvariant().Split('+'); var held=new List<ushort>();
                            var keys=new Dictionary<string,ushort>{{"return",13},{"escape",27},{"tab",9},{"backspace",8},{"left",37},{"right",39},{"up",38},{"down",40},{"plus",187},{"=",187},{"-",189},{"0",48}};
                            string last=parts[parts.Length-1];ushort code;
                            if(keys.ContainsKey(last))code=keys[last];else if(last.Length==1 && last[0]>='a' && last[0]<='z')code=(ushort)Char.ToUpperInvariant(last[0]);else throw new Exception("Unsupported key");
                            try { for(int i=0;i<parts.Length-1;i++){ ushort mod=parts[i]=="ctrl"||parts[i]=="cmd"? (ushort)17:parts[i]=="shift"?(ushort)16:parts[i]=="alt"?(ushort)18:parts[i]=="super"?(ushort)91:(ushort)0;if(mod==0)throw new Exception("Unknown modifier");Key(mod,0,0);held.Add(mod); }Key(code,0,0);Key(code,0,2); }
                            finally { held.Reverse();foreach(ushort mod in held)Key(mod,0,2); }
                        } else throw new Exception("Unknown desktop operation");
                    }
                }
            }
            Console.WriteLine(json.Serialize(result));
        } catch(Exception e) { Console.WriteLine(json.Serialize(new {error=e.Message}));Environment.Exit(1); }
    }
}
